// src/services/database/DatabaseService.ts
import { open } from 'react-native-quick-sqlite';
import { 
  getDatabaseDirectory, 
  getDatabasePath, 
  copyDatabaseFromAssets,
  fileExistsSafe,
  getDatabaseAssetPath
} from '../../utils/paths';
import * as FileSystem from 'react-native-fs';
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

type QueryResult<T = any> = {
  rows?: { _array: T[]; length: number };
  insertId?: number;
  rowsAffected: number;
};

type QuickSQLiteDatabase = ReturnType<typeof open>;

// Types for our database schema
export interface Book {
  id: number;
  name: string;
  testament: 'old' | 'new';
  chapters: number;
  filename: string;
}

export interface Verse {
  id: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  text: string;
}

export interface Hymn {
  id: string;
  number: number;
  category?: string;
  title: string;
  authors: string;
}

export interface HymnVerse {
  id: number;
  hymn_id: string;
  verse_number: number;
  text: string;
  is_chorus: boolean;
}

// Database configuration
type DatabaseServiceConfig = {
  dbName: string;
  assetPath: string;
};

class DatabaseService {
  private db: QuickSQLiteDatabase | null = null;
  private dbName: string;
  private assetPath: string;
  private initPromise: Promise<void> | null = null;

  constructor(config: DatabaseServiceConfig) {
    this.dbName = config.dbName;
    this.assetPath = config.assetPath;
  }

  // Initialize the database connection
  public async initDatabase(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    if (this.db) {
      if (__DEV__) {
        console.log('Database already initialized');
      }
      return;
    }

    this.initPromise = (async () => {
      try {
        if (__DEV__) {
          console.log(`Starting database initialization: ${this.dbName}`);
        }
        
        // Check if we need to copy pre-built database from assets
        // IMPORTANT: The copied DB must be placed in the same directory used by react-native-quick-sqlite.
        const dbDirectory = getDatabaseDirectory();
        const dbPath = getDatabasePath(this.dbName);
        const exists = await fileExistsSafe(dbPath);
        
        if (!exists) {
          if (__DEV__) {
            console.log('Database not found, copying from assets...');
          }
          const assetPath = __DEV__ ? getDatabaseAssetPath(this.dbName) : (this.assetPath || getDatabaseAssetPath(this.dbName));
          
          try {
            await copyDatabaseFromAssets(assetPath, dbPath);
            const stats = await FileSystem.stat(dbPath);
            if (__DEV__) {
              console.log('Database file size after copy (bytes):', stats.size);
              console.log('Database copied successfully from assets');
            }
          } catch (error) {
            console.error('Failed to copy database from assets:', error);
            throw error;
          }
        }
        
        // Open the database (either copied or existing)
        this.db = open({
          name: this.dbName,
          location: 'default',
        });
        if (__DEV__) {
          console.log('Database opened successfully');
        }

        await this.executeQuery('PRAGMA foreign_keys = ON');

        try {
          const dbList = await this.executeQuery<{ seq: number; name: string; file: string }>(
            'PRAGMA database_list'
          );
          if (__DEV__) {
            console.log('PRAGMA database_list:', dbList.rows);
          }
        } catch (error) {
          if (__DEV__) {
            console.log('Failed to read PRAGMA database_list');
          }
        }

        if (__DEV__) {
          console.log(`Database initialization completed successfully: ${this.dbName}`);
        }
      } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    await this.initPromise;
  }

  // Execute a query with parameters
  private async executeQueryInternal<T>(
    query: string,
    params: any[] = [],
    logError: boolean
  ): Promise<{ rows: T[]; insertId?: number; rowsAffected: number }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.execute(query, params) as QueryResult<T>;
      return {
        rows: result.rows?._array || [],
        insertId: result.insertId,
        rowsAffected: result.rowsAffected || 0,
      };
    } catch (error) {
      if (logError) {
        console.error('Database query error:', error, '\nQuery:', query);
      }
      throw error;
    }
  }

  async executeQuery<T>(
    query: string,
    params: any[] = []
  ): Promise<{ rows: T[]; insertId?: number; rowsAffected: number }> {
    return this.executeQueryInternal<T>(query, params, true);
  }

  // Execute a query but do not log errors (useful when caller handles expected failures)
  async executeQuerySilent<T>(
    query: string,
    params: any[] = []
  ): Promise<{ rows: T[]; insertId?: number; rowsAffected: number }> {
    return this.executeQueryInternal<T>(query, params, false);
  }

  // Execute a transaction
  async executeTransaction<T>(
    callback: (tx: QuickSQLiteDatabase) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Start transaction
      this.db.execute('BEGIN TRANSACTION');
      
      try {
        // Execute the callback with the db instance
        const result = await callback(this.db);
        
        // If we get here, commit the transaction
        this.db.execute('COMMIT');
        return result;
      } catch (error) {
        // If any error occurs, rollback the transaction
        this.db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  // Close the database connection
  async closeDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (__DEV__) {
      console.log('Database connection closed');
    }
  }
}

export const bibleDatabaseService = new DatabaseService({
  dbName: 'BibleMG65.db',
  assetPath: getDatabaseAssetPath('BibleMG65.db'),
});

export const hymnsDatabaseService = new DatabaseService({
  dbName: 'Hymns.db',
  assetPath: getDatabaseAssetPath('Hymns.db'),
});

export const databaseService = bibleDatabaseService;
export default bibleDatabaseService;