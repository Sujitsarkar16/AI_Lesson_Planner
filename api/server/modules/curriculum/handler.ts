import { ObjectId } from 'mongodb';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { getDatabase, id, objectId } from '../../shared/database.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { requireOwnedDocument } from '../documents/handler.js';
import { profileFor } from '../user/service.js';

export async function handleCurriculum(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser) {
  const isCurriculumPath = path.startsWith('/curriculum') || path.startsWith('/concept-maps') || path === '/lesson-sequences';
  if (!isCurriculumPath) return false;

  const url = new URL(req.url || '/', 'http://localhost');
  const db = await getDatabase();
  const body = req.method === 'GET' ? {} : await readBody(req);
  const profile = await profileFor(auth, body);
  const userId = profile._id as ObjectId;

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
