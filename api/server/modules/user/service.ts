import { getDatabase, id } from '../../shared/database.js';
import type { AuthenticatedUser } from '../../shared/auth.js';

export const profileFor = async (auth: AuthenticatedUser, details: Record<string, any> = {}) => {
  const users = (await getDatabase()).collection('users'); const now = new Date();
  await users.updateOne({ auth0Id: auth.auth0Id }, { $setOnInsert: { auth0Id: auth.auth0Id, email: auth.email || details.email || `${auth.auth0Id}@auth0.local`, name: auth.name || details.name || null, createdAt: now }, $set: { updatedAt: now } }, { upsert: true });
  const user = await users.findOne({ auth0Id: auth.auth0Id }); if (!user) throw new Error('Unable to load user profile.'); return user;
};
export const profileResponse = (user: any) => ({ id: id(user._id), auth0_id: user.auth0Id, email: user.email, name: user.name || null, subscription_tier: user.subscriptionTier || 'free', subscription_id: user.subscriptionId || null, subscription_status: user.subscriptionStatus || null, subscription_current_period_end: user.subscriptionCurrentPeriodEnd?.toISOString?.() || null, usage_count: user.usageCount || 0, usage_reset_date: user.usageResetDate?.toISOString?.() || null, created_at: user.createdAt?.toISOString?.() || new Date().toISOString(), updated_at: user.updatedAt?.toISOString?.() || new Date().toISOString() });
