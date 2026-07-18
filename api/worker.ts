import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDatabase } from './server/shared/database.js';
import { cleanupExpiredArtifacts, processOneJob } from './server/modules/billing/jobs.js';
import { refreshDashboardMetrics } from './server/modules/billing/handler.js';

// ponytail: the worker deliberately selects its isolated credential before the shared Mongo client is initialized.
process.env.MONGODB_URI = process.env.WORKER_MONGODB_URI || process.env.MONGODB_URI;

const workerId = process.env.WORKER_ID || `billing-worker-${randomUUID()}`;
let running = true;
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const runWorker = async () => {
  let nextMetricsAt = 0;
  let nextArtifactCleanupAt = 0;
  while (running) {
    try {
      const db = await getDatabase();
      const processed = await processOneJob(db, workerId);
      if (Date.now() >= nextMetricsAt) { await refreshDashboardMetrics(db); nextMetricsAt = Date.now() + 5 * 60_000; }
      if (Date.now() >= nextArtifactCleanupAt) { await cleanupExpiredArtifacts(db); nextArtifactCleanupAt = Date.now() + 60_000; }
      if (!processed) await pause(1_000);
    } catch (error) {
      console.error('Billing worker iteration failed', error);
      await pause(1_000);
    }
  }
};

export const stopWorker = () => { running = false; };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWorker().catch((error) => { console.error('Billing worker stopped unexpectedly', error); process.exitCode = 1; });
}
