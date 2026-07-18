import { GoogleGenAI } from '@google/genai';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { getDatabase } from '../../shared/database.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { consumeGenerationQuota, profileFor, usageLimit } from '../user/service.js';

type GenerationOptions = { temperature?: number; maxTokens?: number };

const validGenerationOptions = (value: unknown): GenerationOptions | null => {
  const options = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 6000;
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) return null;
  if (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 6000) return null;
  return { temperature, maxTokens };
};

const streamGeneration = async (res: ApiResponse, prompt: string, options: GenerationOptions) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  const ai = new GoogleGenAI({ apiKey });
  const stream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    contents: prompt,
    config: { temperature: options.temperature, maxOutputTokens: options.maxTokens }
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for await (const chunk of stream) {
    if (chunk.text) res.write(chunk.text);
  }
  res.end();
};

export async function handleGeneration(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser) {
  if (path !== '/generate' || req.method !== 'POST') return false;

  const body = await readBody(req);
  const profile = await profileFor(auth, body);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const options = validGenerationOptions(body.options);
  if (!prompt || prompt.length > 12000) return json(res, 400, { error: 'Generation prompt must be between 1 and 12,000 characters.' });
  if (!options) return json(res, 400, { error: 'Generation options are invalid.' });
  if (!(await consumeGenerationQuota(profile))) {
    const latestProfile = await (await getDatabase()).collection('users').findOne({ _id: profile._id });
    return json(res, 429, await usageLimit(latestProfile || profile));
  }
  await streamGeneration(res, prompt, options);
  return true;
}
