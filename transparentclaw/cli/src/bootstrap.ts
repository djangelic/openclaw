import axios from 'axios';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DeploymentConfig } from './installer.js';

interface DataTableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'datetime' | 'json';
    required?: boolean;
    unique?: boolean;
  }>;
}

interface WorkflowTemplate {
  name: string;
  description: string;
  file: string;
  tags: string[];
}

export class Bootstrap {
  private config: DeploymentConfig;
  private n8nBaseUrl: string;
  private n8nApiKey?: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.n8nBaseUrl = `http://localhost:${config.ports.n8n}`;
  }

  public async initialize(): Promise<void> {
    const spinner = ora('Bootstrapping TransparentClaw agent...').start();

    try {
      // Wait for n8n to be fully ready
      await this.waitForN8n();
      
      // Initialize n8n API access
      await this.initializeN8nApi();
      
      // Create Data Tables
      spinner.text = 'Creating data tables...';
      await this.createDataTables();
      
      // Import workflow templates
      spinner.text = 'Importing workflows...';
      await this.importWorkflows();
      
      // Setup initial soul/agent configuration
      spinner.text = 'Configuring agent personality...';
      await this.setupAgentSoul();
      
      // Create initial user profile
      spinner.text = 'Setting up user profile...';
      await this.setupUserProfile();
      
      // Configure skills registry
      spinner.text = 'Registering skills...';
      await this.setupSkillsRegistry();
      
      // Setup heartbeat/proactive behavior
      spinner.text = 'Configuring proactive behavior...';
      await this.setupHeartbeat();
      
      spinner.succeed(chalk.green('Agent bootstrap completed'));

    } catch (error) {
      spinner.fail(chalk.red('Bootstrap failed'));
      throw error;
    }
  }

  private async waitForN8n(maxWaitTime: number = 120000): Promise<void> {
    const checkInterval = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${this.n8nBaseUrl}/healthz`, {
          timeout: 3000
        });
        
        if (response.status === 200) {
          return; // n8n is ready
        }
      } catch (error) {
        // n8n not ready yet, wait and retry
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('n8n failed to start within the expected time');
  }

  private async initializeN8nApi(): Promise<void> {
    try {
      // For embedded n8n, we might not need API key initially
      // This is a placeholder for when we have proper API authentication
      
      // Test API connection
      const response = await axios.get(`${this.n8nBaseUrl}/api/v1/workflows`, {
        timeout: 5000,
        headers: this.getApiHeaders()
      });
      
      if (response.status !== 200) {
        throw new Error('Failed to connect to n8n API');
      }
      
    } catch (error) {
      console.warn(chalk.yellow('n8n API access limited - continuing with basic setup'));
    }
  }

  private async createDataTables(): Promise<void> {
    const tables: DataTableSchema[] = [
      {
        name: 'soul',
        columns: [
          { name: 'key', type: 'string', required: true, unique: true },
          { name: 'value', type: 'string', required: true },
          { name: 'updated_at', type: 'datetime', required: true }
        ]
      },
      {
        name: 'memory_long_term',
        columns: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'category', type: 'string', required: true },
          { name: 'content', type: 'string', required: true },
          { name: 'importance', type: 'string', required: true },
          { name: 'created_at', type: 'datetime', required: true },
          { name: 'updated_at', type: 'datetime', required: true }
        ]
      },
      {
        name: 'memory_daily',
        columns: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'date', type: 'string', required: true },
          { name: 'content', type: 'string', required: true },
          { name: 'source', type: 'string', required: true },
          { name: 'created_at', type: 'datetime', required: true }
        ]
      },
      {
        name: 'skills_registry',
        columns: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string', required: true },
          { name: 'workflow_id', type: 'string', required: true },
          { name: 'enabled', type: 'boolean', required: true }
        ]
      },
      {
        name: 'user_profile',
        columns: [
          { name: 'key', type: 'string', required: true, unique: true },
          { name: 'value', type: 'string', required: true },
          { name: 'updated_at', type: 'datetime', required: true }
        ]
      },
      {
        name: 'tool_config',
        columns: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'tool_name', type: 'string', required: true },
          { name: 'key', type: 'string', required: true },
          { name: 'value', type: 'string', required: true },
          { name: 'encrypted', type: 'boolean', required: true }
        ]
      },
      {
        name: 'conversations',
        columns: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'session_id', type: 'string', required: true },
          { name: 'role', type: 'string', required: true },
          { name: 'content', type: 'string', required: true },
          { name: 'timestamp', type: 'datetime', required: true }
        ]
      }
    ];

    for (const table of tables) {
      try {
        // Note: This is a placeholder - actual Data Tables API calls will be implemented
        // when we have the proper n8n Data Tables API documentation
        
        console.log(chalk.gray(`  Creating table: ${table.name}`));
        
        // For now, we'll create the table structure in a configuration file
        // that the bridge service can use to initialize the tables properly
        await this.createTableConfig(table);
        
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Failed to create table ${table.name}: ${error}`));
      }
    }
  }

  private async createTableConfig(schema: DataTableSchema): Promise<void> {
    const configDir = './agent-data/tables';
    const configPath = join(configDir, `${schema.name}.json`);
    
    try {
      await require('fs/promises').mkdir(configDir, { recursive: true });
      await writeFile(configPath, JSON.stringify(schema, null, 2));
    } catch (error) {
      console.warn(`Failed to save table config for ${schema.name}: ${error}`);
    }
  }

  private async importWorkflows(): Promise<void> {
    const workflows: WorkflowTemplate[] = [
      {
        name: '🧠 Main Agent',
        description: 'Core AI agent workflow with Chat Hub integration',
        file: 'main-agent.json',
        tags: ['core', 'ai', 'chat']
      },
      {
        name: '📝 Memory Manager',
        description: 'Reads and writes agent memory to Data Tables',
        file: 'memory-manager.json',
        tags: ['memory', 'core']
      },
      {
        name: '⏰ Heartbeat',
        description: 'Proactive check-in schedule trigger',
        file: 'heartbeat.json',
        tags: ['proactive', 'schedule']
      },
      {
        name: '📅 Calendar Skill',
        description: 'Calendar operations and scheduling',
        file: 'skill-calendar.json',
        tags: ['skill', 'calendar', 'productivity']
      },
      {
        name: '🔍 Web Search Skill',
        description: 'Web search and information retrieval',
        file: 'skill-web-search.json',
        tags: ['skill', 'search', 'web']
      },
      {
        name: '📊 Notion Skill',
        description: 'Notion database operations',
        file: 'skill-notion.json',
        tags: ['skill', 'notion', 'database']
      }
    ];

    for (const workflow of workflows) {
      try {
        console.log(chalk.gray(`  Importing: ${workflow.name}`));
        
        // Read workflow template
        const templatePath = join(__dirname, '../../templates', workflow.file);
        let workflowData: any;
        
        try {
          const templateContent = await readFile(templatePath, 'utf-8');
          workflowData = JSON.parse(templateContent);
        } catch (error) {
          // Template doesn't exist yet, create a minimal placeholder
          workflowData = this.createWorkflowPlaceholder(workflow);
        }
        
        // Import workflow via n8n API
        await this.importWorkflow(workflowData);
        
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Failed to import workflow ${workflow.name}: ${error}`));
      }
    }
  }

  private createWorkflowPlaceholder(template: WorkflowTemplate): any {
    return {
      name: template.name,
      active: false,
      nodes: [
        {
          parameters: {},
          id: `${Date.now()}`,
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [250, 300]
        }
      ],
      connections: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {},
      staticData: {},
      tags: template.tags
    };
  }

  private async importWorkflow(workflowData: any): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.n8nBaseUrl}/api/v1/workflows`,
        workflowData,
        {
          headers: this.getApiHeaders(),
          timeout: 10000
        }
      );
      
      return response.data?.id || null;
      
    } catch (error) {
      throw new Error(`Failed to import workflow: ${error}`);
    }
  }

  private async setupAgentSoul(): Promise<void> {
    const soulEntries = [
      { key: 'name', value: this.config.agentName || 'TransparentClaw' },
      { key: 'emoji', value: '🔍' },
      { key: 'personality', value: 'Transparent, helpful AI agent powered by n8n workflows. I show you exactly how I work and what I\'m doing behind the scenes.' },
      { key: 'communication', value: 'Clear and direct communication. I explain my reasoning and show my workflow execution steps.' },
      { key: 'boundaries', value: 'I respect privacy and security. I only access what you explicitly give me permission to access.' },
      { key: 'voice', value: 'Professional but approachable. I\'m here to help you get things done efficiently.' },
      { key: 'transparency_mode', value: 'full' },
      { key: 'workflow_visibility', value: 'enabled' },
      { key: 'created_at', value: new Date().toISOString() }
    ];

    // Store soul configuration
    const soulConfig = {
      entries: soulEntries,
      updated_at: new Date().toISOString()
    };

    await writeFile('./agent-data/soul.json', JSON.stringify(soulConfig, null, 2));
    
    // Also store in a format the bridge service can use to sync to Data Tables
    for (const entry of soulEntries) {
      await this.upsertDataTableRow('soul', {
        key: entry.key,
        value: entry.value,
        updated_at: new Date().toISOString()
      });
    }
  }

  private async setupUserProfile(): Promise<void> {
    const defaultProfile = [
      { key: 'name', value: 'User' },
      { key: 'timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { key: 'setup_date', value: new Date().toISOString() },
      { key: 'deployment_type', value: this.config.type },
      { key: 'networking', value: this.config.networking }
    ];

    const profileConfig = {
      entries: defaultProfile,
      updated_at: new Date().toISOString()
    };

    await writeFile('./agent-data/user-profile.json', JSON.stringify(profileConfig, null, 2));
    
    for (const entry of defaultProfile) {
      await this.upsertDataTableRow('user_profile', {
        key: entry.key,
        value: entry.value,
        updated_at: new Date().toISOString()
      });
    }
  }

  private async setupSkillsRegistry(): Promise<void> {
    const skills = [
      {
        id: 'calendar',
        name: 'Calendar',
        description: 'Manage calendar events and scheduling',
        workflow_id: 'calendar-skill', // Will be updated when workflows are imported
        enabled: true
      },
      {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the web for information',
        workflow_id: 'web-search-skill',
        enabled: true
      },
      {
        id: 'memory',
        name: 'Memory Management',
        description: 'Read and write long-term memory',
        workflow_id: 'memory-manager',
        enabled: true
      },
      {
        id: 'notion',
        name: 'Notion Integration',
        description: 'Interact with Notion databases',
        workflow_id: 'notion-skill',
        enabled: false // Disabled by default until configured
      }
    ];

    const skillsConfig = {
      skills,
      updated_at: new Date().toISOString()
    };

    await writeFile('./agent-data/skills.json', JSON.stringify(skillsConfig, null, 2));
    
    for (const skill of skills) {
      await this.upsertDataTableRow('skills_registry', skill);
    }
  }

  private async setupHeartbeat(): Promise<void> {
    const heartbeatConfig = {
      enabled: true,
      interval_minutes: 30,
      checks: [
        'system_status',
        'memory_cleanup',
        'workflow_health'
      ],
      last_run: null,
      created_at: new Date().toISOString()
    };

    await writeFile('./agent-data/heartbeat.json', JSON.stringify(heartbeatConfig, null, 2));
  }

  private async upsertDataTableRow(tableName: string, data: any): Promise<void> {
    // Placeholder for Data Tables API call
    // This will be implemented when we have the proper n8n Data Tables API
    
    console.log(chalk.gray(`    ${tableName}: ${JSON.stringify(data)}`));
    
    // For now, store in local JSON files that the bridge can sync
    const tableDir = './agent-data/tables-data';
    await require('fs/promises').mkdir(tableDir, { recursive: true });
    
    const tableDataPath = join(tableDir, `${tableName}.json`);
    let tableData: any[] = [];
    
    try {
      const existing = await readFile(tableDataPath, 'utf-8');
      tableData = JSON.parse(existing);
    } catch {
      // File doesn't exist yet
    }
    
    // Simple upsert logic
    const existingIndex = tableData.findIndex((row: any) => {
      if (data.id) return row.id === data.id;
      if (data.key) return row.key === data.key;
      return false;
    });
    
    if (existingIndex >= 0) {
      tableData[existingIndex] = { ...tableData[existingIndex], ...data };
    } else {
      tableData.push(data);
    }
    
    await writeFile(tableDataPath, JSON.stringify(tableData, null, 2));
  }

  private getApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.n8nApiKey) {
      headers['Authorization'] = `Bearer ${this.n8nApiKey}`;
    }
    
    return headers;
  }

  public async openChatHub(): Promise<void> {
    const chatUrl = `${this.n8nBaseUrl}/chat`;
    
    console.log(chalk.green(`\n🚀 Opening Chat Hub at: ${chatUrl}`));
    
    try {
      const { default: open } = await import('open');
      await open(chatUrl);
    } catch (error) {
      console.log(chalk.yellow('Could not open browser automatically.'));
      console.log(chalk.gray(`Please open: ${chatUrl}`));
    }
  }
}