import { getDatabase, id } from '../../shared/database.js';
import type { AuthenticatedUser } from '../../shared/auth.js';

export const profileFor = async (auth: AuthenticatedUser, details: Record<string, any> = {}) => {
  const db = await getDatabase();
  const users = db.collection('users');
  const now = new Date();
  await users.updateOne(
    { auth0Id: auth.auth0Id },
    {
      $setOnInsert: {
        auth0Id: auth.auth0Id,
        email: auth.email || details.email || `${auth.auth0Id}@auth0.local`,
        name: auth.name || details.name || null,
        subscriptionTier: 'free',
        usageCount: 0,
        usageResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdAt: now
      },
      $set: { updatedAt: now }
    },
    { upsert: true }
  );
  const user = await users.findOne({ auth0Id: auth.auth0Id });
  if (!user) throw new Error('Unable to load user profile.');
  return user;
};

export const profileResponse = (user: any) => ({
  id: id(user._id),
  auth0_id: user.auth0Id,
  email: user.email,
  name: user.name || null,
  subscription_tier: user.subscriptionTier || 'free',
  subscription_id: user.subscriptionId || null,
  subscription_status: user.subscriptionStatus || null,
  subscription_current_period_end: user.subscriptionCurrentPeriodEnd?.toISOString?.() || null,
  usage_count: user.usageCount || 0,
  usage_reset_date: user.usageResetDate?.toISOString?.() || new Date().toISOString(),
  created_at: user.createdAt?.toISOString?.() || new Date().toISOString(),
  updated_at: user.updatedAt?.toISOString?.() || new Date().toISOString()
});

export const usageLimit = async (user: any) => {
  const db = await getDatabase();
  const users = db.collection('users');
  const now = new Date();
  if (!user.usageResetDate || user.usageResetDate < now) {
    await users.updateOne({ _id: user._id }, { $set: { usageCount: 0, usageResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), updatedAt: now } });
    user.usageCount = 0;
  }
  const tier = user.subscriptionTier || 'free';
  const limit = tier === 'free' ? 5 : 999999;
  return { allowed: (user.usageCount || 0) < limit, current: user.usageCount || 0, limit, tier, reason: (user.usageCount || 0) >= limit ? 'Usage limit reached' : undefined };
};

export const consumeGenerationQuota = async (user: any): Promise<boolean> => {
  const db = await getDatabase();
  const now = new Date();
  const resetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const limit = (user.subscriptionTier || 'free') === 'free' ? 5 : 999999;
  const resetRequired = {
    $or: [
      { $eq: [{ $ifNull: ['$usageResetDate', null] }, null] },
      { $lte: ['$usageResetDate', now] }
    ]
  };
  const currentUsage = { $cond: [resetRequired, 0, { $ifNull: ['$usageCount', 0] }] };
  const result = await db.collection('users').updateOne(
    { _id: user._id, $expr: { $lt: [currentUsage, limit] } },
    [{
      $set: {
        usageCount: { $add: [currentUsage, 1] },
        usageResetDate: { $cond: [resetRequired, resetDate, '$usageResetDate'] },
        updatedAt: now
      }
    }]
  );
  return result.modifiedCount === 1;
};
