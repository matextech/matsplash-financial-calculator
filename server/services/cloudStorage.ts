import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cloud Storage service for syncing SQLite database
 * Downloads database on startup, uploads on shutdown
 */
export class CloudStorageService {
  private storage: Storage | null = null;
  private bucketName: string;
  private dbFileName: string;
  private localDbPath: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || 'matsplash-fin-db';
    this.dbFileName = process.env.DB_FILE_NAME || 'database.sqlite';
    this.localDbPath = process.env.DATABASE_PATH || './database.sqlite';

    // Initialize Cloud Storage client (only in production)
    // App Engine automatically provides GOOGLE_APPLICATION_CREDENTIALS
    if (process.env.NODE_ENV === 'production') {
      try {
        this.storage = new Storage();
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to initialize Cloud Storage:', error);
        }
        // Continue without Cloud Storage in case of errors
      }
    }
  }

  /**
   * Download database from Cloud Storage on startup
   */
  async downloadDatabase(): Promise<boolean> {
    if (!this.storage || process.env.NODE_ENV !== 'production') {
      // In development, use local database
      return true;
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(this.dbFileName);

      // Check if file exists in Cloud Storage
      const [exists] = await file.exists();
      
      if (exists) {
        // Download database file
        const localDir = path.dirname(this.localDbPath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }

        await file.download({ destination: this.localDbPath });
        console.log(`✅ Database downloaded from Cloud Storage: ${this.bucketName}/${this.dbFileName}`);
        return true;
      } else {
        // File doesn't exist yet - will be created on first run
        console.log(`ℹ️ Database file not found in Cloud Storage. Will create new database.`);
        return true;
      }
    } catch (error: any) {
      console.error('❌ Error downloading database from Cloud Storage:', error.message);
      // Continue with local database if download fails
      return false;
    }
  }

  /**
   * Upload database to Cloud Storage on shutdown or periodically
   */
  async uploadDatabase(): Promise<boolean> {
    if (!this.storage || process.env.NODE_ENV !== 'production') {
      return true;
    }

    try {
      // Check if local database file exists
      if (!fs.existsSync(this.localDbPath)) {
        console.log('ℹ️ Local database file does not exist. Skipping upload.');
        return true;
      }

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(this.dbFileName);

      // Upload database file
      await file.save(fs.readFileSync(this.localDbPath), {
        metadata: {
          contentType: 'application/x-sqlite3',
          cacheControl: 'no-cache'
        }
      });

      console.log(`✅ Database uploaded to Cloud Storage: ${this.bucketName}/${this.dbFileName}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error uploading database to Cloud Storage:', error.message);
      return false;
    }
  }

  /**
   * Check if Cloud Storage is available
   */
  isAvailable(): boolean {
    return this.storage !== null && process.env.NODE_ENV === 'production';
  }
}

// Singleton instance
export const cloudStorageService = new CloudStorageService();

