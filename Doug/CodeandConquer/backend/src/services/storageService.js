/**
 * Storage Service
 * 
 * Service for interacting with Supabase Storage (buckets and objects).
 * Provides file upload, download, and management functionality.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { STORAGE_TABLES, getStorageTableName } from '../config/supabaseStorageSchema.js';

dotenv.config();

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

class StorageService {
  constructor() {
    this.hasAccess = !!supabase;
  }

  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Get all buckets
   * @returns {Promise<Array>} Array of bucket objects
   */
  async getBuckets() {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching buckets:', error);
      throw error;
    }
  }

  /**
   * Get bucket by name
   * @param {string} bucketName - Bucket name
   * @returns {Promise<Object|null>} Bucket object or null
   */
  async getBucket(bucketName) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      if (error) {
        if (error.statusCode === 404) return null;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching bucket:', error);
      return null;
    }
  }

  /**
   * Create a new bucket
   * @param {string} bucketName - Bucket name
   * @param {Object} options - Bucket options (public, fileSizeLimit, allowedMimeTypes)
   * @returns {Promise<Object>} Created bucket
   */
  async createBucket(bucketName, options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: options.public || false,
        fileSizeLimit: options.fileSizeLimit || null,
        allowedMimeTypes: options.allowedMimeTypes || null,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bucket:', error);
      throw error;
    }
  }

  /**
   * Delete a bucket
   * @param {string} bucketName - Bucket name
   * @returns {Promise<boolean>} Success status
   */
  async deleteBucket(bucketName) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage.deleteBucket(bucketName);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting bucket:', error);
      throw error;
    }
  }

  /**
   * List objects in a bucket
   * @param {string} bucketName - Bucket name
   * @param {string} path - Path prefix (optional)
   * @param {Object} options - List options (limit, offset, sortBy)
   * @returns {Promise<Array>} Array of file objects
   */
  async listObjects(bucketName, path = '', options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(path, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy || { column: 'name', order: 'asc' },
        });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  /**
   * Upload a file to storage
   * @param {string} bucketName - Bucket name
   * @param {string} path - File path
   * @param {File|Buffer} file - File to upload
   * @param {Object} options - Upload options (metadata, contentType, upsert)
   * @returns {Promise<Object>} Upload result with path
   */
  async uploadFile(bucketName, path, file, options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, {
          contentType: options.contentType,
          upsert: options.upsert || false,
          metadata: options.metadata || {},
        });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Download a file from storage
   * @param {string} bucketName - Bucket name
   * @param {string} path - File path
   * @returns {Promise<Blob>} File blob
   */
  async downloadFile(bucketName, path) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(path);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} bucketName - Bucket name
   * @param {string} path - File path
   * @returns {string} Public URL
   */
  getPublicUrl(bucketName, path) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Create a signed URL for a file
   * @param {string} bucketName - Bucket name
   * @param {string} path - File path
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<string>} Signed URL
   */
  async createSignedUrl(bucketName, path, expiresIn = 3600) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} bucketName - Bucket name
   * @param {string} path - File path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(bucketName, path) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([path]);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Move/rename a file
   * @param {string} bucketName - Bucket name
   * @param {string} fromPath - Source path
   * @param {string} toPath - Destination path
   * @returns {Promise<boolean>} Success status
   */
  async moveFile(bucketName, fromPath, toPath) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .move(fromPath, toPath);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  }

  /**
   * Copy a file
   * @param {string} bucketName - Bucket name
   * @param {string} fromPath - Source path
   * @param {string} toPath - Destination path
   * @returns {Promise<boolean>} Success status
   */
  async copyFile(bucketName, fromPath, toPath) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .copy(fromPath, toPath);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error copying file:', error);
      throw error;
    }
  }

  /**
   * Query storage.objects table directly
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async queryObjects(options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    const { select = '*', where = {}, orderBy = null, limit = null } = options;

    try {
      let query = supabase
        .from('objects')
        .select(select);

      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      if (orderBy) {
        query = query.order(orderBy.field, { ascending: orderBy.ascending !== false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error querying objects:', error);
      throw error;
    }
  }
}

export default new StorageService();

