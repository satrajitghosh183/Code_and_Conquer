/**
 * Supabase Storage Schema Reference
 * 
 * This file documents all Supabase storage tables available in the database.
 * These tables are managed by Supabase Storage and can be accessed via the Supabase client.
 */

export const STORAGE_TABLES = {
  BUCKETS: 'storage.buckets',
  BUCKETS_ANALYTICS: 'storage.buckets_analytics',
  OBJECTS: 'storage.objects',
  PREFIXES: 'storage.prefixes',
  S3_MULTIPART_UPLOADS: 'storage.s3_multipart_uploads',
  S3_MULTIPART_UPLOADS_PARTS: 'storage.s3_multipart_uploads_parts',
  MIGRATIONS: 'storage.migrations',
};

export const BUCKETS_FIELDS = {
  id: 'id',
  name: 'name',
  owner: 'owner',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  public: 'public',
  avifAutodetection: 'avif_autodetection',
  fileSizeLimit: 'file_size_limit',
  allowedMimeTypes: 'allowed_mime_types',
  ownerId: 'owner_id',
  type: 'type',
};

export const OBJECTS_FIELDS = {
  id: 'id',
  bucketId: 'bucket_id',
  name: 'name',
  owner: 'owner',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  lastAccessedAt: 'last_accessed_at',
  metadata: 'metadata',
  pathTokens: 'path_tokens',
  version: 'version',
  ownerId: 'owner_id',
  userMetadata: 'user_metadata',
  level: 'level',
};

export const S3_MULTIPART_UPLOADS_FIELDS = {
  id: 'id',
  inProgressSize: 'in_progress_size',
  uploadSignature: 'upload_signature',
  bucketId: 'bucket_id',
  key: 'key',
  version: 'version',
  ownerId: 'owner_id',
  createdAt: 'created_at',
  userMetadata: 'user_metadata',
};

export const S3_MULTIPART_UPLOADS_PARTS_FIELDS = {
  id: 'id',
  uploadId: 'upload_id',
  size: 'size',
  partNumber: 'part_number',
  bucketId: 'bucket_id',
  key: 'key',
  etag: 'etag',
  ownerId: 'owner_id',
  version: 'version',
  createdAt: 'created_at',
};

export function getStorageTableName(fullTableName) {
  return fullTableName.replace('storage.', '');
}

export function isStorageTable(tableName) {
  return Object.values(STORAGE_TABLES).includes(tableName) || 
         tableName.startsWith('storage.');
}

