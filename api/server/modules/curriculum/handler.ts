import { ObjectId } from 'mongodb';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { getDatabase, id, objectId } from '../../shared/database.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { requireOwnedDocument } from '../documents/handler.js';
import { profileFor } from '../user/service.js';
import { normalizePlanInput, validatePlanInput, type AcademicPlanInput, type CalendarBlock } from './calendarOptimization.js';
import {
  createPlan,
  getCurrentPlan,
  getPlanVersion,
  listPlanVersionSummaries,
  replacePlanInput,
  InputRevisionConflictError,
  PlanNotFoundError,
} from './calendarPlanStore.js';

/** Calendar-block `kind` (as it appears on a block) -> the input collection that holds it. */
const BLOCK_KIND_TO_COLLECTION = {
  Holiday: 'holidays',
  Examination: 'examinations',
  SchoolEvent: 'school_events',
  TeacherLeave: 'teacher_leave',
} as const;
type BlockCollectionKey = (typeof BLOCK_KIND_TO_COLLECTION)[keyof typeof BLOCK_KIND_TO_COLLECTION];

export async function handleCurriculum(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser) {
  const isCurriculumPath = path.startsWith('/curriculum') || path.startsWith('/concept-maps') || path === '/lesson-sequences';
  if (!isCurriculumPath) return false;

  const url = new URL(req.url || '/', 'http://localhost');
  const db = await getDatabase();
  const body = req.method === 'GET' ? {} : await readBody(req);
  const profile = await profileFor(auth, body);
  const userId = profile._id as ObjectId;

  // ---- Academic Calendar Optimization plans (owner-scoped; pure engine + Mongo only, never generation) ----
  if (path.startsWith('/curriculum/calendar-plans')) {
    return handleCalendarPlans(req, res, path, url, body, userId);
  }

  if (path === '/curriculum/standards' && req.method === 'GET') {
    const standards = await db.collection('curriculum_standards').find({ board: url.searchParams.get('board'), grade: url.searchParams.get('grade'), subject: url.searchParams.get('subject') }).sort({ standard_code: 1 }).toArray();
    return json(res, 200, standards.map(({ _id, ...standard }) => ({ id: id(_id), ...standard })));
  }
  if (path === '/curriculum/coverage' && req.method === 'GET') {
    const filter = { userId, board: url.searchParams.get('board'), grade: url.searchParams.get('grade'), subject: url.searchParams.get('subject') };
    const [standards, coverage] = await Promise.all([db.collection('curriculum_standards').countDocuments({ board: filter.board, grade: filter.grade, subject: filter.subject }), db.collection('coverage_tracking').find(filter).sort({ lastCoveredAt: -1 }).toArray()]);
    return json(res, 200, { summary: { total_standards: standards, covered_standards: coverage.length, coverage_percentage: standards ? Number(((coverage.length / standards) * 100).toFixed(2)) : 0 }, details: coverage.map(({ _id, userId: _, standardId, lastCoveredAt, ...entry }) => ({ id: id(_id), user_id: id(userId), standard_id: id(standardId), last_covered_at: lastCoveredAt.toISOString(), ...entry })) });
  }
  if (path === '/curriculum/coverage' && req.method === 'POST') {
    await requireOwnedDocument(body.documentId, userId);
    const standardIds = (body.standardIds || []).map(objectId).filter(Boolean);
    const standards = await db.collection('curriculum_standards').find({ _id: { $in: standardIds } }).toArray();
    const now = new Date();
    await Promise.all(standards.map((standard) => db.collection('coverage_tracking').updateOne({ userId, board: standard.board, grade: standard.grade, subject: standard.subject, standardId: standard._id }, { $inc: { totalLessons: 1 }, $set: { lastCoveredAt: now, coverage_status: 'Covered', updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true })));
    return json(res, 200, { success: true });
  }
  if (path === '/concept-maps/nodes' && req.method === 'POST') {
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    if (!nodes.length) return json(res, 200, { success: true });
    const mapId = nodes[0].map_id;
    await db.collection('concept_map_nodes').deleteMany({ userId, mapId });
    await db.collection('concept_map_nodes').insertMany(nodes.map((node: any) => ({ userId, mapId, node_key: node.node_key, label: node.label, position_x: node.position_x, position_y: node.position_y, metadata: node.metadata || {}, updatedAt: new Date() })));
    return json(res, 200, { success: true });
  }
  if (path === '/concept-maps/edges' && req.method === 'POST') {
    const edges = Array.isArray(body.edges) ? body.edges : [];
    if (!edges.length) return json(res, 200, { success: true });
    const mapId = edges[0].map_id;
    const ownsMap = await db.collection('concept_map_nodes').findOne({ userId, mapId });
    if (!ownsMap) return json(res, 404, { error: 'Concept map not found.' });
    await db.collection('concept_map_edges').deleteMany({ userId, mapId });
    await db.collection('concept_map_edges').insertMany(edges.map((edge: any) => ({ userId, mapId, edge_key: edge.edge_key, source_node_key: edge.source_node_key, target_node_key: edge.target_node_key, relationship_type: edge.relationship_type || 'prerequisite', updatedAt: new Date() })));
    return json(res, 200, { success: true });
  }
  if (path.startsWith('/concept-maps/') && req.method === 'GET') {
    const mapId = path.slice('/concept-maps/'.length);
    const [nodes, edges] = await Promise.all([db.collection('concept_map_nodes').find({ userId, mapId }).toArray(), db.collection('concept_map_edges').find({ userId, mapId }).toArray()]);
    return json(res, 200, { nodes: nodes.map((node) => ({ id: node.node_key, position: { x: node.position_x, y: node.position_y }, data: { label: node.label, ...(node.metadata || {}) } })), edges: edges.map((edge) => ({ id: edge.edge_key, source: edge.source_node_key, target: edge.target_node_key, type: edge.relationship_type })) });
  }
  if (path === '/lesson-sequences' && req.method === 'POST') {
    const now = new Date();
    const sequence = { userId, map_id: body.map_id, sequence_name: body.sequence_name, subject: body.subject, grade: body.grade, board: body.board || null, lesson_order: body.lesson_order || [], metadata: body.metadata || {}, createdAt: now, updatedAt: now };
    const result = await db.collection('lesson_sequences').insertOne(sequence);
    return json(res, 201, { id: id(result.insertedId), user_id: id(userId), ...sequence });
  }
  return false;
}

/**
 * Owner-scoped calendar-plan routes. Every store call is scoped by the auth-derived
 * `userId` (never a request-supplied owner). Input is always normalized + validated
 * BEFORE any persistence (Requirement 1.5 / 7): invalid input returns `400` with
 * diagnostics and no write happens. Stale `expectedInputRevision` -> `409`; unknown or
 * non-owned plan -> `404` with no existence details. No generation service is ever called.
 */
async function handleCalendarPlans(req: ApiRequest, res: ApiResponse, path: string, url: URL, body: Record<string, any>, userId: ObjectId) {
  const method = req.method || 'GET';
  const segments = path.split('/').filter(Boolean); // e.g. ['curriculum','calendar-plans','<id>','versions','<n>']
  const planIdSegment = segments[2];
  const subResource = segments[3]; // 'versions' | 'calendar-blocks' | undefined
  const subId = segments[4];

  // Validate a candidate input, returning normalized input or a 400 response.
  const validateOr400 = (input: AcademicPlanInput): { ok: true; normalized: AcademicPlanInput } | { ok: false } => {
    const normalized = normalizePlanInput(input);
    const diagnostics = validatePlanInput(normalized);
    if (diagnostics.length > 0) {
      json(res, 400, { error: 'Invalid calendar plan input.', diagnostics });
      return { ok: false };
    }
    return { ok: true, normalized };
  };

  // Map the store's typed errors to 404 / 409; rethrow anything else to the top-level handler.
  const respondForStoreError = (error: unknown): boolean => {
    if (error instanceof PlanNotFoundError) { json(res, 404, { error: 'Plan not found.' }); return true; }
    if (error instanceof InputRevisionConflictError) {
      json(res, 409, { error: 'Plan was modified by another change. Reload the current version and retry.', currentInputRevision: error.currentInputRevision });
      return true;
    }
    return false;
  };

  // POST /curriculum/calendar-plans  — create a plan from { input }
  if (!planIdSegment && method === 'POST') {
    const validated = validateOr400(body.input ?? {});
    if (!validated.ok) return true;
    const plan = await createPlan(userId, validated.normalized);
    return json(res, 201, plan);
  }

  if (!planIdSegment) return json(res, 404, { error: 'Plan not found.' });
  const planId = objectId(planIdSegment);
  if (!planId) return json(res, 404, { error: 'Plan not found.' }); // Invalid ID reveals nothing about existence.

  // GET /curriculum/calendar-plans/:planId/versions/:version — immutable historical version
  if (subResource === 'versions' && method === 'GET') {
    const version = Number(subId);
    if (!Number.isInteger(version) || version < 1) return json(res, 404, { error: 'Plan version not found.' });
    const planVersion = await getPlanVersion(userId, planId, version);
    if (!planVersion) return json(res, 404, { error: 'Plan version not found.' });
    return json(res, 200, planVersion);
  }

  // GET /curriculum/calendar-plans/:planId — current input, current version, compact history
  if (!subResource && method === 'GET') {
    const current = await getCurrentPlan(userId, planId);
    if (!current) return json(res, 404, { error: 'Plan not found.' });
    const history = await listPlanVersionSummaries(userId, planId);
    return json(res, 200, { ...current, history });
  }

  // PUT /curriculum/calendar-plans/:planId — replace all input using { input, expectedInputRevision }
  if (!subResource && method === 'PUT') {
    if (!Number.isInteger(body.expectedInputRevision)) return json(res, 400, { error: 'expectedInputRevision (integer) is required.' });
    const validated = validateOr400(body.input ?? {});
    if (!validated.ok) return true;
    try {
      const plan = await replacePlanInput(userId, planId, validated.normalized, body.expectedInputRevision);
      return json(res, 200, plan);
    } catch (error) {
      if (respondForStoreError(error)) return true;
      throw error;
    }
  }

  // PUT/DELETE /curriculum/calendar-plans/:planId/calendar-blocks/:blockId — upsert / remove one block
  if (subResource === 'calendar-blocks' && (method === 'PUT' || method === 'DELETE') && subId) {
    if (!Number.isInteger(body.expectedInputRevision)) return json(res, 400, { error: 'expectedInputRevision (integer) is required.' });

    // Resolve the target block collection from its kind. For PUT it comes from the block
    // payload; for DELETE it is supplied as `?kind=` (nothing else identifies which
    // collection holds the block id being removed).
    const kind = method === 'PUT' ? body.block?.kind : url.searchParams.get('kind');
    const collection = BLOCK_KIND_TO_COLLECTION[kind as keyof typeof BLOCK_KIND_TO_COLLECTION] as BlockCollectionKey | undefined;
    if (!collection) return json(res, 400, { error: 'A valid block kind (Holiday | Examination | SchoolEvent | TeacherLeave) is required.' });

    // Concurrency: read the current input, apply the single-block change, then persist
    // with the caller's expected revision. Any change between this read and the write is
    // caught by the revision precondition inside replacePlanInput (-> 409), so there is no
    // lost update despite the read-modify-write.
    const current = await getCurrentPlan(userId, planId);
    if (!current) return json(res, 404, { error: 'Plan not found.' });

    const existing = current.input[collection] as CalendarBlock[];
    let nextBlocks: CalendarBlock[];
    if (method === 'PUT') {
      const block = { ...body.block, kind } as CalendarBlock;
      if (!block.block_id) return json(res, 400, { error: 'block.block_id is required.' });
      if (block.block_id !== subId) return json(res, 400, { error: 'block.block_id must match the URL block id.' });
      nextBlocks = [...existing.filter((existingBlock) => existingBlock.block_id !== subId), block];
    } else {
      nextBlocks = existing.filter((existingBlock) => existingBlock.block_id !== subId);
    }

    const candidate: AcademicPlanInput = { ...current.input, [collection]: nextBlocks };
    const validated = validateOr400(candidate);
    if (!validated.ok) return true;
    try {
      const plan = await replacePlanInput(userId, planId, validated.normalized, body.expectedInputRevision);
      return json(res, 200, plan);
    } catch (error) {
      if (respondForStoreError(error)) return true;
      throw error;
    }
  }

  return json(res, 404, { error: 'Plan not found.' });
}
