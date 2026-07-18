import { ObjectId } from 'mongodb';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { getDatabase, id, objectId } from '../../shared/database.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { profileFor } from '../user/service.js';

const documentResponse = (document: any) => ({
  id: id(document._id),
  title: document.title,
  subject: document.subject,
  grade: document.grade,
  dateCreated: document.createdAt.toISOString().slice(0, 10),
  content: document.content,
  duration: document.duration || undefined,
  type: document.type,
  templateId: document.templateId || undefined,
  imageUrl: document.imageUrl || undefined,
  metadata: document.metadata || {}
});

export const requireOwnedDocument = async (documentId: string, userId: ObjectId) => {
  const parsedId = objectId(documentId);
  if (!parsedId) throw new Error('Invalid document ID.');
  const document = await (await getDatabase()).collection('documents').findOne({ _id: parsedId, userId });
  if (!document) throw new Error('Document not found.');
  return document;
};

export async function handleDocuments(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser) {
  if (!path.startsWith('/documents')) return false;

  const db = await getDatabase();
  const body = req.method === 'GET' ? {} : await readBody(req);
  const profile = await profileFor(auth, body);
  const userId = profile._id as ObjectId;

  if (path === '/documents' && req.method === 'GET') {
    const documents = await db.collection('documents').find({ userId }).sort({ createdAt: -1 }).toArray();
    return json(res, 200, documents.map(documentResponse));
  }
  if (path === '/documents' && req.method === 'POST') {
    const now = new Date();
    const document = { userId, type: body.type || 'lesson-plan', title: body.title, subject: body.subject, grade: body.grade, content: body.content || '', metadata: body.metadata || {}, templateId: body.templateId || null, imageUrl: body.imageUrl || null, duration: body.duration || null, createdAt: now, updatedAt: now };
    const result = await db.collection('documents').insertOne(document);
    return json(res, 201, documentResponse({ ...document, _id: result.insertedId }));
  }
  if (path.startsWith('/documents/') && req.method === 'DELETE') {
    const parsedId = objectId(path.slice('/documents/'.length));
    if (!parsedId) return json(res, 400, { error: 'Invalid document ID.' });
    const result = await db.collection('documents').deleteOne({ _id: parsedId, userId });
    return json(res, result.deletedCount ? 200 : 404, { success: Boolean(result.deletedCount) });
  }
  return false;
}
