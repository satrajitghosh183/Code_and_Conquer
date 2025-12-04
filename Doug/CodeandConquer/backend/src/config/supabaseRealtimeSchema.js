/**
 * Supabase Realtime Schema Reference
 * 
 * This file documents all Supabase realtime tables available in the database.
 */

export const REALTIME_TABLES = {
  MESSAGES: 'realtime.messages',
  SUBSCRIPTIONS: 'realtime.subscription',
  SCHEMA_MIGRATIONS: 'realtime.schema_migrations',
};

export const MESSAGES_FIELDS = {
  id: 'id',
  topic: 'topic',
  extension: 'extension',
  payload: 'payload',
  event: 'event',
  private: 'private',
  updatedAt: 'updated_at',
  insertedAt: 'inserted_at',
};

export const SUBSCRIPTIONS_FIELDS = {
  id: 'id',
  subscriptionId: 'subscription_id',
  entity: 'entity',
  filters: 'filters',
  claims: 'claims',
  claimsRole: 'claims_role',
  createdAt: 'created_at',
};

export function getRealtimeTableName(fullTableName) {
  return fullTableName.replace('realtime.', '');
}

export function isRealtimeTable(tableName) {
  return Object.values(REALTIME_TABLES).includes(tableName) || 
         tableName.startsWith('realtime.');
}

