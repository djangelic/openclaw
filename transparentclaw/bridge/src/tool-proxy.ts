import axios from 'axios';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface Tool {
  id: string;
  name: string;
  description: string;
  skillId?: string;
  workflowId?: string;
  endpoint?: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

interface ToolExecution {
  toolName: string;
  parameters: Record<string, any>;
  timestamp: string;
  executionId?: string;
}

interface ProxyStatus {
  enabled: boolean;
  toolCount: number;
  executionCount: number;
  errorCount: number;
  lastExecution: string | null;
}

export class ToolProxy {
  private static instance: ToolProxy;
  private n8nBaseUrl: string;
  private gatewayBaseUrl: string;
  private dataPath: string;
  private status: ProxyStatus;
  private tools: Map<string, Tool>;

  private constructor() {
    this.n8nBaseUrl = process.env.N8N_BASE_URL || 'http://n8n:5678';
    this.gatewayBaseUrl = process.env.GATEWAY_BASE_URL || 'http://gateway:3100';
    this.dataPath = process.env.DATA_PATH || '/app/data';
    this.status = {
      enabled: true,
      toolCount: 0,
      executionCount: 0,
      errorCount: 0,
      lastExecution: null
    };
    this.tools = new Map();
  }

  public static getInstance(): ToolProxy {
    if (!ToolProxy.instance) {
      ToolProxy.instance = new ToolProxy();
    }
    return ToolProxy.instance;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Tool Proxy...');
      
      // Load available tools from skills registry
      await this.loadTools();
      
      // Register built-in tools
      await this.registerBuiltInTools();
      
      console.log(`✅ Tool Proxy initialized with ${this.tools.size} tools`);
      
    } catch (error) {
      console.error('❌ Tool Proxy initialization failed:', error);
      throw error;
    }
  }

  public async executeTool(toolName: string, parameters: Record<string, any> = {}): Promise<any> {
    if (!this.status.enabled) {
      throw new Error('Tool proxy is disabled');
    }

    const startTime = Date.now();
    
    try {
      console.log(`🔧 Executing tool: ${toolName}`, parameters);
      
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      if (!tool.enabled) {
        throw new Error(`Tool is disabled: ${toolName}`);
      }

      let result: any;

      // Route execution based on tool type
      if (tool.workflowId) {
        result = await this.executeViaWorkflow(tool, parameters);
      } else if (tool.endpoint) {
        result = await this.executeViaEndpoint(tool, parameters);
      } else {
        result = await this.executeViaGateway(tool, parameters);
      }

      const executionTime = Date.now() - startTime;
      
      // Log execution
      const execution: ToolExecution = {
        toolName,
        parameters,
        timestamp: new Date().toISOString(),
        executionId: result.executionId || `exec_${Date.now()}`
      };
      
      await this.logExecution(execution, result, executionTime);
      
      this.status.executionCount++;
      this.status.lastExecution = execution.timestamp;
      
      console.log(`✅ Tool execution completed: ${toolName} (${executionTime}ms)`);
      
      return result;

    } catch (error) {
      this.status.errorCount++;
      console.error(`❌ Tool execution failed: ${toolName}`, error);
      
      // Log error
      await this.logExecution({
        toolName,
        parameters,
        timestamp: new Date().toISOString()
      }, { error: error instanceof Error ? error.message : String(error) }, Date.now() - startTime);
      
      throw error;
    }
  }

  private async executeViaWorkflow(tool: Tool, parameters: Record<string, any>): Promise<any> {
    try {
      // Execute n8n workflow
      const response = await axios.post(`${this.n8nBaseUrl}/api/v1/workflows/${tool.workflowId}/execute`, {
        input: parameters
      }, {
        timeout: 30000 // 30 second timeout for workflow execution
      });

      return response.data;

    } catch (error) {
      console.error(`Workflow execution failed for tool ${tool.name}:`, error);
      throw new Error(`Workflow execution failed: ${error}`);
    }
  }

  private async executeViaEndpoint(tool: Tool, parameters: Record<string, any>): Promise<any> {
    try {
      // Direct HTTP endpoint call
      const response = await axios.post(tool.endpoint!, {
        tool: tool.name,
        parameters
      }, {
        timeout: 15000
      });

      return response.data;

    } catch (error) {
      console.error(`Endpoint execution failed for tool ${tool.name}:`, error);
      throw new Error(`Endpoint execution failed: ${error}`);
    }
  }

  private async executeViaGateway(tool: Tool, parameters: Record<string, any>): Promise<any> {
    try {
      // Route through OpenClaw Gateway
      const response = await axios.post(`${this.gatewayBaseUrl}/tools/execute`, {
        tool: tool.name,
        parameters
      }, {
        timeout: 30000
      });

      return response.data;

    } catch (error) {
      console.error(`Gateway execution failed for tool ${tool.name}:`, error);
      throw new Error(`Gateway execution failed: ${error}`);
    }
  }

  public async listAvailableTools(): Promise<Tool[]> {
    return Array.from(this.tools.values()).filter(tool => tool.enabled);
  }

  public async registerTool(tool: Tool): Promise<boolean> {
    try {
      this.tools.set(tool.name, tool);
      this.status.toolCount = this.tools.size;
      
      console.log(`🔧 Tool registered: ${tool.name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to register tool ${tool.name}:`, error);
      return false;
    }
  }

  public async unregisterTool(toolName: string): Promise<boolean> {
    try {
      const deleted = this.tools.delete(toolName);
      this.status.toolCount = this.tools.size;
      
      if (deleted) {
        console.log(`🗑️  Tool unregistered: ${toolName}`);
      }
      
      return deleted;
      
    } catch (error) {
      console.error(`Failed to unregister tool ${toolName}:`, error);
      return false;
    }
  }

  private async loadTools(): Promise<void> {
    try {
      // Load skills registry to discover available tools
      const skillsPath = join(this.dataPath, 'skills.json');
      
      if (existsSync(skillsPath)) {
        const skillsData = JSON.parse(await readFile(skillsPath, 'utf-8'));
        
        for (const skill of skillsData.skills || []) {
          if (skill.enabled) {
            const tool: Tool = {
              id: skill.id,
              name: skill.name.toLowerCase().replace(/\s+/g, '_'),
              description: skill.description,
              skillId: skill.id,
              workflowId: skill.workflow_id,
              parameters: skill.parameters || {},
              enabled: skill.enabled
            };
            
            this.tools.set(tool.name, tool);
          }
        }
      }
      
      this.status.toolCount = this.tools.size;
      
    } catch (error) {
      console.error('Failed to load tools from skills:', error);
    }
  }

  private async registerBuiltInTools(): Promise<void> {
    const builtInTools: Tool[] = [
      {
        id: 'memory_read',
        name: 'memory_read',
        description: 'Read from agent memory (soul, long-term, or daily)',
        parameters: {
          type: { type: 'string', enum: ['soul', 'long_term', 'daily'], required: true },
          key: { type: 'string', required: false },
          category: { type: 'string', required: false }
        },
        enabled: true
      },
      {
        id: 'memory_write',
        name: 'memory_write',
        description: 'Write to agent memory',
        parameters: {
          type: { type: 'string', enum: ['soul', 'long_term', 'daily'], required: true },
          key: { type: 'string', required: false },
          content: { type: 'string', required: true },
          category: { type: 'string', required: false },
          importance: { type: 'string', enum: ['low', 'medium', 'high'], required: false }
        },
        enabled: true
      },
      {
        id: 'workflow_execute',
        name: 'workflow_execute',
        description: 'Execute a specific n8n workflow',
        parameters: {
          workflow_id: { type: 'string', required: true },
          input: { type: 'object', required: false }
        },
        enabled: true
      },
      {
        id: 'system_status',
        name: 'system_status',
        description: 'Get system and service status',
        parameters: {},
        enabled: true
      }
    ];

    for (const tool of builtInTools) {
      this.tools.set(tool.name, tool);
    }

    this.status.toolCount = this.tools.size;
    console.log(`🔧 Registered ${builtInTools.length} built-in tools`);
  }

  private async logExecution(execution: ToolExecution, result: any, executionTime: number): Promise<void> {
    try {
      // Log to local execution history
      const logEntry = {
        ...execution,
        result: result.error ? { error: result.error } : { success: true },
        executionTime,
        timestamp: new Date().toISOString()
      };

      // TODO: Implement proper execution logging
      // For now, just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Tool execution log:', JSON.stringify(logEntry, null, 2));
      }

    } catch (error) {
      console.error('Failed to log tool execution:', error);
    }
  }

  public getStatus(): ProxyStatus {
    return { ...this.status };
  }

  public async disable(): Promise<void> {
    this.status.enabled = false;
    console.log('🛑 Tool proxy disabled');
  }

  public async enable(): Promise<void> {
    this.status.enabled = true;
    console.log('✅ Tool proxy enabled');
  }
}