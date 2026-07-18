type Environment = Record<string, string | undefined>;

type StripeConfiguration = {
  secretKey: string;
  webhookSecret: string;
  proPriceId: string;
};

export type ServerConfiguration = {
  publicAppOrigin?: string;
  stripe?: StripeConfiguration;
  admin?: { claim: string; value: string };
  workerMongoUri?: string;
  auditWriterMongoUri?: string;
};

const nonEmpty = (value: string | undefined) => value?.trim() || undefined;

export const normalizePublicAppOrigin = (value: string | undefined): string | undefined => {
  const configuredUrl = nonEmpty(value);
  if (!configuredUrl) return undefined;
  try {
    const url = new URL(configuredUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
};

export const getServerConfiguration = (environment: Environment = process.env): ServerConfiguration => {
  const secretKey = nonEmpty(environment.STRIPE_SECRET_KEY);
  const webhookSecret = nonEmpty(environment.STRIPE_WEBHOOK_SECRET);
  const proPriceId = nonEmpty(environment.STRIPE_PRO_PRICE_ID);
  const adminClaim = nonEmpty(environment.AUTH0_ADMIN_CLAIM);
  const adminValue = nonEmpty(environment.AUTH0_ADMIN_VALUE);
  const workerMongoUri = nonEmpty(environment.WORKER_MONGODB_URI);
  const auditWriterMongoUri = nonEmpty(environment.AUDIT_WRITER_MONGODB_URI);

  return {
    publicAppOrigin: normalizePublicAppOrigin(environment.VITE_APP_URL),
    stripe: secretKey && webhookSecret && proPriceId ? { secretKey, webhookSecret, proPriceId } : undefined,
    admin: adminClaim && adminValue ? { claim: adminClaim, value: adminValue } : undefined,
    workerMongoUri: workerMongoUri?.match(/^mongodb(?:\+srv)?:\/\//i) ? workerMongoUri : undefined,
    auditWriterMongoUri: auditWriterMongoUri?.match(/^mongodb(?:\+srv)?:\/\//i) ? auditWriterMongoUri : undefined
  };
};
