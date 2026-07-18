import { apiRequest } from '@/shared/api/apiClient';

export type GenerationJobStatus = 'queued' | 'retrying' | 'completed' | 'failed';
type GenerationOperation = 'lesson-plan' | 'syllabus' | 'exam-paper' | 'mcq-paper' | 'study-notes' | 'concept-map' | 'ai-chat';
type JobResponse = { id?: string; status?: GenerationJobStatus; content?: string; result?: unknown; job?: JobResponse };
type StatusCallback = (status: GenerationJobStatus) => void;

const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const pause = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const unwrap = (response: JobResponse) => response.job || response;
const resultContent = (response: JobResponse): string | undefined => {
  const value = response.content ?? (response.result as { content?: unknown } | undefined)?.content ?? response.result;
  return typeof value === 'string' ? value : undefined;
};

async function* generateOperationStream(operation: GenerationOperation, input: Record<string, unknown>, onStatus?: StatusCallback): AsyncGenerator<string, void, unknown> {
  let job = unwrap(await apiRequest<JobResponse>(`/generate/${operation}`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify({ input }) }));
  while (true) {
    const status = job.status || 'queued';
    onStatus?.(status);
    const content = resultContent(job);
    if (status === 'completed') { if (content) yield content; return; }
    if (status === 'failed') throw new Error('The server could not complete this generation job.');
    if (!job.id) throw new Error('The server did not return a generation job ID.');
    await pause(1000);
    job = unwrap(await apiRequest<JobResponse>(`/generation-jobs/${encodeURIComponent(job.id)}`));
  }
}

export async function* generateLessonPlanStream(params: Record<string, unknown> & { onStatus?: StatusCallback }) { const { onStatus, ...input } = params; yield* generateOperationStream('lesson-plan', input, onStatus); }
export async function* generateSyllabusStream(params: Record<string, unknown> & { onStatus?: StatusCallback }) { const { onStatus, ...input } = params; yield* generateOperationStream('syllabus', input, onStatus); }
export async function* generateQuestionPaperStream(params: Record<string, unknown> & { onStatus?: StatusCallback }) { const { onStatus, ...input } = params; yield* generateOperationStream('exam-paper', input, onStatus); }
export async function* generateQuizStream(params: Record<string, unknown> & { onStatus?: StatusCallback }) { const { onStatus, ...input } = params; yield* generateOperationStream('mcq-paper', input, onStatus); }
export async function* generateStudyNotesStream(params: Record<string, unknown> & { onStatus?: StatusCallback }) { const { onStatus, ...input } = params; yield* generateOperationStream('study-notes', input, onStatus); }

export async function generateConceptMap(params: Record<string, unknown> & { onStatus?: StatusCallback }): Promise<{ nodes: unknown[]; edges: unknown[] }> {
  const { onStatus, ...input } = params;
  let content = '';
  for await (const chunk of generateOperationStream('concept-map', input, onStatus)) content += chunk;
  const map = JSON.parse(content) as { nodes?: unknown[]; edges?: unknown[] };
  if (!Array.isArray(map.nodes) || !Array.isArray(map.edges)) throw new Error('The completed job did not return a valid concept map.');
  return { nodes: map.nodes, edges: map.edges };
}

export async function* generateTutorResponseStream(params: Record<string, unknown> & { onStatus?: StatusCallback }) { const { onStatus, ...input } = params; yield* generateOperationStream('ai-chat', input, onStatus); }
export async function* generateParentReportStream(_params: Record<string, unknown>): AsyncGenerator<string, void, unknown> { throw new Error('Parent report generation is not available in the current plan catalog.'); }
