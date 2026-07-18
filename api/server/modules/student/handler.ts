import type { ApiRequest, ApiResponse } from '../../shared/http.js';
import { json, readBody } from '../../shared/http.js';
import { getDatabase, getMongoClient, id, objectId } from '../../shared/database.js';
import { expiredStudentCookie, readStudentSession, signStudentSession, studentCookie } from '../../shared/studentSession.js';

const assignmentResponse = (assignment: any, submission?: any) => ({
  id: id(assignment._id),
  title: assignment.title,
  type: assignment.type,
  due_date: assignment.dueDate?.toISOString?.() || null,
  status: assignment.status,
  content: assignment.content,
  subject: assignment.subject || 'General',
  updated_at: (submission?.submittedAt || assignment.updatedAt || assignment.createdAt).toISOString(),
  metadata: submission ? { score: submission.score, percentage: submission.percentage } : assignment.metadata || {}
});

export async function handleStudent(req: ApiRequest, res: ApiResponse, path: string) {
  const db = await getDatabase();
  const body = req.method === 'GET' ? {} : await readBody(req);

  if (path === '/student/login' && req.method === 'POST') {
    const accessCode = String(body.code || '').trim().toUpperCase();
    const student = await db.collection('students').findOne({ accessCode, isActive: { $ne: false } });
    if (!student) return json(res, 401, { error: 'Invalid student code.' });
    res.setHeader('Set-Cookie', studentCookie(signStudentSession(id(student._id), Date.now() + 8 * 60 * 60 * 1000)));
    return json(res, 200, { id: id(student._id), name: student.name, grade: student.grade });
  }
  if (path === '/student/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', expiredStudentCookie);
    return json(res, 200, { success: true });
  }

  const studentId = objectId(readStudentSession(req));
  if (!studentId) return json(res, 401, { error: 'Invalid student session.' });
  if (path === '/student/assignments' && req.method === 'GET') {
    const assignments = await db.collection('assignments').find({ studentId }).sort({ dueDate: 1 }).toArray();
    const submissions = await db.collection('submissions').find({ studentId }).toArray();
    const byAssignment = new Map(submissions.map((submission) => [id(submission.assignmentId), submission]));
    return json(res, 200, assignments.map((assignment) => assignmentResponse(assignment, byAssignment.get(id(assignment._id)))));
  }
  if (path.startsWith('/student/assignments/') && path.endsWith('/submit') && req.method === 'POST') {
    const assignmentId = objectId(path.slice('/student/assignments/'.length, -'/submit'.length));
    if (!assignmentId) return json(res, 400, { error: 'Invalid assignment ID.' });
    const assignment = await db.collection('assignments').findOne({ _id: assignmentId, studentId });
    if (!assignment) return json(res, 404, { error: 'Assignment not found.' });
    const existingSubmission = await db.collection('submissions').findOne({ assignmentId, studentId });
    if (existingSubmission) return json(res, 200, { success: true });
    const now = new Date();
    const submission = { assignmentId, studentId, answers: body.answers || {}, score: Number(body.score) || 0, percentage: Number(body.score) || 0, feedback: body.feedback || {}, submittedAt: now, createdAt: now };
    const session = (await getMongoClient()).startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection('submissions').insertOne(submission, { session });
        const result = await db.collection('assignments').updateOne({ _id: assignmentId, studentId }, { $set: { status: 'completed', updatedAt: now } }, { session });
        if (!result.matchedCount) throw new Error('Assignment not found.');
      });
    } finally {
      await session.endSession();
    }
    return json(res, 200, { success: true });
  }
  return json(res, 404, { error: 'Endpoint not found.' });
}
