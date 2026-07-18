import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ApiRequest } from './http.js';

const studentCookieName = 'student_session';

const sessionSecret = () => {
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret) throw new Error('STUDENT_SESSION_SECRET is not configured.');
  return secret;
};

export const signStudentSession = (studentId: string, expiresAt: number) => {
  const payload = Buffer.from(JSON.stringify({ studentId, expiresAt })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

export const readStudentSession = (req: ApiRequest) => {
  const token = req.headers.cookie?.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${studentCookieName}=`))?.slice(studentCookieName.length + 1);
  if (!token) throw new Error('Student session required.');
  const [payload, signature] = token.split('.');
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid student session.');
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!session.studentId || session.expiresAt < Date.now()) throw new Error('Student session expired.');
  return session.studentId as string;
};

export const studentCookie = (token: string) => `${studentCookieName}=${token}; Path=/api/student; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
export const expiredStudentCookie = `${studentCookieName}=; Path=/api/student; HttpOnly; SameSite=Lax; Max-Age=0`;
