import type { AuthenticatedUser } from '../../shared/auth.js';
import { getDatabase } from '../../shared/database.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { evaluateFlag, idempotencyKey, reserveUsage } from '../billing/core.js';
import { createGenerationJob, generationInput, jobResponse, operationFor } from '../billing/jobs.js';

export async function handleGeneration(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser, profile: any) {
  const operationName = path.startsWith('/generate/') ? path.slice('/generate/'.length) : '';
  if (req.method !== 'POST' || !operationName || operationName.includes('/')) return false;
  const operation = operationFor(operationName); if (!operation) return json(res, 404, { error: 'Generation operation is unavailable.' });
  const key = idempotencyKey(req.headers['idempotency-key']); if (!key) return json(res, 400, { error: 'A valid Idempotency-Key header is required.' });
  const body = await readBody(req); if (Object.keys(body).some((field) => field !== 'input')) return json(res, 400, { error: 'Generation request is invalid.' });
  const input = generationInput(body.input); if (!input) return json(res, 400, { error: 'Generation input is invalid.' });
  const db = await getDatabase();
  if (!(await evaluateFlag(db, `generation.${operation.operation}`, auth.auth0Id))) return json(res, 403, { error: 'Generation operation is unavailable.', code: 'FeatureUnavailable' });
  const reservation = await reserveUsage(db, profile._id, auth.auth0Id, operation.productKey, key);
  if (reservation.accepted === false) return json(res, reservation.status, { error: reservation.reason === 'UsageExhausted' ? 'Usage allowance exhausted.' : 'This capability requires an upgrade.', code: reservation.reason, productKey: reservation.productKey, used: reservation.used, limit: reservation.limit, periodEnd: reservation.periodEnd.toISOString() });
  const job = await createGenerationJob(db, profile._id, reservation.reservation, operation.operation, operation.productKey, key, input);
  await db.collection('usage_reservations').updateOne({ _id: reservation.reservation._id, jobId: { $exists: false } }, { $set: { jobId: job._id } });
  return json(res, 202, jobResponse(job));
}
