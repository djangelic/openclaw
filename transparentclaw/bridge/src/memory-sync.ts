import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { Client } from 'pg';

interface MemoryEntry {
  id?: string;
  key?: string;
  value?: string;
  content?: string;
  category?: string;
  importance?: string;
  created_at?: string;
  updated_at?: string;
}

interface SyncStatus {
  enabled: boolean;
  lastSync: string | null;
  errorCount: number;
  totalSyncs: number;
}

export class MemorySync {
  private static instance: MemorySync;
  private n8nBaseUrl: string;
  private databaseUrl: string;
  private dataPath: string;
  private status: SyncStatus;
  private pgClient?: Client;

  private constructor() {
    this.n8nBaseUrl = process.env.N8N_BASE_URL || 'http://n8n:5678';
    this.databaseUrl = process.env.DATABASE_URL || 'postgresql://n8n:password@postgres:5432/transparentclaw';
    this.dataPath = process.env.DATA_PATH || '/app/data';
    this.status = {
      enabled: true,
      lastSync: null,
      errorCount: 0,
      totalSyncs: 0
    };
  }

  public static getInstance(): MemorySync {
    if (!MemorySync.instance) {
      MemorySync.instance = new MemorySync();
    }
    return MemorySync.instance;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🧠 Initializing Memory Sync...');
      
      // Initialize PostgreSQL connection
      this.pgClient = new Client({
        connectionString: this.databaseUrl
      });
      
      await this.pgClient.connect();
      
      // Ensure data directories exist
      await this.ensureDataDirectories();
      
      // Perform initial sync
      await this.performSync();
      
      console.log('✅ Memory Sync initialized');
      
    } catch (error) {
      console.error('❌ Memory Sync initialization failed:', error);
      throw error;
    }
  }

  public async performSync(): Promise<{ synced: number; errors: number }> {
    if (!this.status.enabled) {
      return { synced: 0, errors: 0 };
    }

    try {
      console.log('🔄 Performing memory sync...');
      
      let syncedCount = 0;
      let errorCount = 0;

      // Sync soul data
      try {
        await this.syncSoulData();
        syncedCount++;
      } catch (error) {
        console.error('Soul sync error:', error);
        errorCount++;
      }

      // Sync long-term memory
      try {
        await this.syncLongTermMemory();
        syncedCount++;
      } catch (error) {
        console.error('Long-term memory sync error:', error);
        errorCount++;
      }

      // Sync daily memory
      try {
        await this.syncDailyMemory();
        syncedCount++;
      } catch (error) {
        console.error('Daily memory sync error:', error);
        errorCount++;
      }

      // Sync user profile
      try {
        await this.syncUserProfile();
        syncedCount++;
      } catch (error) {
        console.error('User profile sync error:', error);
        errorCount++;
      }

      this.status.lastSync = new Date().toISOString();
      this.status.totalSyncs++;
      this.status.errorCount += errorCount;

      console.log(`✅ Memory sync complete: ${syncedCount} synced, ${errorCount} errors`);
      
      return { synced: syncedCount, errors: errorCount };

    } catch (error) {
      console.error('❌ Memory sync failed:', error);
      this.status.errorCount++;
      throw error;
    }
  }

  public async updateMemory(tableName: string, data: MemoryEntry): Promise<boolean> {
    try {
      // Update local data first
      await this.updateLocalData(tableName, data);
      
      // Then sync to n8n Data Tables
      await this.syncToDataTable(tableName, data);
      
      return true;
      
    } catch (error) {
      console.error(`Memory update failed for ${tableName}:`, error);
      return false;
    }
  }

  private async syncSoulData(): Promise<void> {
    const soulPath = join(this.dataPath, 'soul.json');
    
    if (!existsSync(soulPath)) {
      console.log('No soul data found, skipping sync');
      return;
    }

    const soulData = JSON.parse(await readFile(soulPath, 'utf-8'));
    
    if (soulData.entries) {
      for (const entry of soulData.entries) {
        await this.syncToDataTable('soul', entry);
      }
    }
  }

  private async syncLongTermMemory(): Promise<void> {
    const memoryPath = join(this.dataPath, 'tables-data', 'memory_long_term.json');
    
    if (!existsSync(memoryPath)) {
      return;
    }

    const memoryData = JSON.parse(await readFile(memoryPath, 'utf-8'));
    
    for (const entry of memoryData) {
      await this.syncToDataTable('memory_long_term', entry);
    }
  }

  private async syncDailyMemory(): Promise<void> {
    const dailyPath = join(this.dataPath, 'tables-data', 'memory_daily.json');
    
    if (!existsSync(dailyPath)) {
      return;
    }

    const dailyData = JSON.parse(await readFile(dailyPath, 'utf-8'));
    
    for (const entry of dailyData) {
      await this.syncToDataTable('memory_daily', entry);
    }
  }

  private async syncUserProfile(): Promise<void> {
    const profilePath = join(this.dataPath, 'user-profile.json');
    
    if (!existsSync(profilePath)) {
      return;
    }

    const profileData = JSON.parse(await readFile(profilePath, 'utf-8'));
    
    if (profileData.entries) {
      for (const entry of profileData.entries) {
        await this.syncToDataTable('user_profile', entry);
      }
    }
  }

  private async syncToDataTable(tableName: string, data: MemoryEntry): Promise<void> {
    try {
      // TODO: Implement actual n8n Data Tables API calls
      // For now, we'll use PostgreSQL direct access as a fallback
      
      if (!this.pgClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Simple upsert query (table structure needs to be created first)
      const query = this.buildUpsertQuery(tableName, data);
      await this.pgClient.query(query.text, query.values);
      
    } catch (error) {
      console.error(`Failed to sync to data table ${tableName}:`, error);
      
      // Fallback: Try n8n API webhook if direct DB fails
      try {
        await this.syncViaWebhook(tableName, data);
      } catch (webhookError) {
        console.error('Webhook fallback also failed:', webhookError);
        throw error; // Re-throw original error
      }
    }
  }

  private buildUpsertQuery(tableName: string, data: MemoryEntry): { text: string; values: any[] } {
    // This is a placeholder implementation
    // The actual schema will depend on how n8n structures Data Tables in PostgreSQL
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);
    
    // Simple INSERT with ON CONFLICT handling (PostgreSQL specific)
    const conflictColumn = data.id ? 'id' : data.key ? 'key' : columns[0];
    
    return {
      text: `
        INSERT INTO "${tableName}" (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT (${conflictColumn}) 
        DO UPDATE SET ${columns.map((col, i) => `${col} = $${i + 1}`).join(', ')}
      `,
      values
    };
  }

  private async syncViaWebhook(tableName: string, data: MemoryEntry): Promise<void> {
    // Fallback: Use n8n webhook endpoint for data table operations
    const webhookUrl = `${this.n8nBaseUrl}/webhook/memory-sync`;
    
    await axios.post(webhookUrl, {
      table: tableName,
      operation: 'upsert',
      data
    }, {
      timeout: 5000
    });
  }

  private async updateLocalData(tableName: string, data: MemoryEntry): Promise<void> {
    const tableDataPath = join(this.dataPath, 'tables-data', `${tableName}.json`);
    let tableData: MemoryEntry[] = [];
    
    // Read existing data
    if (existsSync(tableDataPath)) {
      tableData = JSON.parse(await readFile(tableDataPath, 'utf-8'));
    }
    
    // Find and update existing entry or add new one
    const key = data.id || data.key;
    const keyField = data.id ? 'id' : 'key';
    const existingIndex = tableData.findIndex((entry: any) => entry[keyField] === key);
    
    if (existingIndex >= 0) {
      tableData[existingIndex] = { ...tableData[existingIndex], ...data, updated_at: new Date().toISOString() };
    } else {
      tableData.push({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    
    // Write back to file
    await writeFile(tableDataPath, JSON.stringify(tableData, null, 2));
  }

  private async ensureDataDirectories(): Promise<void> {
    const dirs = [
      this.dataPath,
      join(this.dataPath, 'tables-data'),
      join(this.dataPath, 'memory'),
      join(this.dataPath, 'skills')
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public async disable(): Promise<void> {
    this.status.enabled = false;
    console.log('🛑 Memory sync disabled');
  }

  public async enable(): Promise<void> {
    this.status.enabled = true;
    console.log('✅ Memory sync enabled');
  }
}