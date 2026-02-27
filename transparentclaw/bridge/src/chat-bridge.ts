import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface ChatMessage {
  id?: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ChatSession {
  id: string;
  userId?: string;
  created_at: string;
  updated_at: string;
  active: boolean;
  metadata?: Record<string, any>;
}

interface BridgeStatus {
  enabled: boolean;
  n8nConnected: boolean;
  gatewayConnected: boolean;
  messagesProcessed: number;
  errorCount: number;
  activeSessions: number;
}

export class ChatBridge extends EventEmitter {
  private static instance: ChatBridge;
  private n8nBaseUrl: string;
  private gatewayBaseUrl: string;
  private status: BridgeStatus;
  private n8nWebSocket?: WebSocket;
  private gatewayWebSocket?: WebSocket;
  private sessions: Map<string, ChatSession>;

  private constructor() {
    super();
    this.n8nBaseUrl = process.env.N8N_BASE_URL || 'http://n8n:5678';
    this.gatewayBaseUrl = process.env.GATEWAY_BASE_URL || 'http://gateway:3100';
    this.status = {
      enabled: true,
      n8nConnected: false,
      gatewayConnected: false,
      messagesProcessed: 0,
      errorCount: 0,
      activeSessions: 0
    };
    this.sessions = new Map();
  }

  public static getInstance(): ChatBridge {
    if (!ChatBridge.instance) {
      ChatBridge.instance = new ChatBridge();
    }
    return ChatBridge.instance;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('💬 Initializing Chat Bridge...');
      
      // Setup WebSocket connections
      await this.setupN8nConnection();
      await this.setupGatewayConnection();
      
      // Setup message routing
      this.setupMessageRouting();
      
      console.log('✅ Chat Bridge initialized');
      
    } catch (error) {
      console.error('❌ Chat Bridge initialization failed:', error);
      throw error;
    }
  }

  public async forwardMessage(messageData: ChatMessage): Promise<any> {
    if (!this.status.enabled) {
      throw new Error('Chat bridge is disabled');
    }

    try {
      console.log(`💬 Forwarding message from ${messageData.role}: ${messageData.content.substring(0, 100)}...`);
      
      let result: any;
      
      if (messageData.role === 'user') {
        // User message: forward to agent via gateway
        result = await this.forwardToGateway(messageData);
      } else if (messageData.role === 'assistant') {
        // Agent response: forward to n8n Chat Hub
        result = await this.forwardToN8n(messageData);
      } else {
        // System message: handle internally
        result = await this.handleSystemMessage(messageData);
      }
      
      // Update session activity
      await this.updateSession(messageData.sessionId);
      
      this.status.messagesProcessed++;
      
      return result;

    } catch (error) {
      this.status.errorCount++;
      console.error('❌ Message forwarding failed:', error);
      throw error;
    }
  }

  private async setupN8nConnection(): Promise<void> {
    try {
      // TODO: Setup WebSocket connection to n8n Chat Hub
      // This will depend on n8n's Chat Hub WebSocket API
      
      // For now, we'll use HTTP polling as a fallback
      console.log('🔗 Setting up n8n connection (HTTP mode)');
      
      // Test connection
      await axios.get(`${this.n8nBaseUrl}/api/v1/workflows`, {
        timeout: 5000
      });
      
      this.status.n8nConnected = true;
      console.log('✅ Connected to n8n');
      
    } catch (error) {
      console.error('❌ Failed to connect to n8n:', error);
      this.status.n8nConnected = false;
      
      // Retry connection after delay
      setTimeout(() => {
        this.setupN8nConnection();
      }, 10000);
    }
  }

  private async setupGatewayConnection(): Promise<void> {
    try {
      // Setup WebSocket connection to OpenClaw Gateway
      const wsUrl = this.gatewayBaseUrl.replace('http', 'ws') + '/ws';
      
      this.gatewayWebSocket = new WebSocket(wsUrl);
      
      this.gatewayWebSocket.on('open', () => {
        console.log('✅ Connected to OpenClaw Gateway');
        this.status.gatewayConnected = true;
      });
      
      this.gatewayWebSocket.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleGatewayMessage(message);
        } catch (error) {
          console.error('Failed to parse gateway message:', error);
        }
      });
      
      this.gatewayWebSocket.on('close', () => {
        console.log('🔌 Gateway connection closed, attempting reconnect...');
        this.status.gatewayConnected = false;
        
        // Reconnect after delay
        setTimeout(() => {
          this.setupGatewayConnection();
        }, 5000);
      });
      
      this.gatewayWebSocket.on('error', (error) => {
        console.error('Gateway WebSocket error:', error);
        this.status.gatewayConnected = false;
      });
      
    } catch (error) {
      console.error('❌ Failed to connect to Gateway:', error);
      this.status.gatewayConnected = false;
      
      // Retry connection after delay
      setTimeout(() => {
        this.setupGatewayConnection();
      }, 10000);
    }
  }

  private setupMessageRouting(): void {
    // Setup bidirectional message routing
    this.on('userMessage', async (message: ChatMessage) => {
      await this.forwardToGateway(message);
    });
    
    this.on('agentResponse', async (message: ChatMessage) => {
      await this.forwardToN8n(message);
    });
    
    this.on('systemEvent', async (event: any) => {
      await this.handleSystemEvent(event);
    });
  }

  private async forwardToGateway(message: ChatMessage): Promise<any> {
    try {
      if (this.gatewayWebSocket && this.gatewayWebSocket.readyState === WebSocket.OPEN) {
        // Send via WebSocket
        this.gatewayWebSocket.send(JSON.stringify({
          type: 'chat_message',
          data: message
        }));
        
        return { sent: true, method: 'websocket' };
      } else {
        // Fallback to HTTP
        const response = await axios.post(`${this.gatewayBaseUrl}/chat/message`, message, {
          timeout: 10000
        });
        
        return response.data;
      }
      
    } catch (error) {
      console.error('Failed to forward message to gateway:', error);
      throw error;
    }
  }

  private async forwardToN8n(message: ChatMessage): Promise<any> {
    try {
      // TODO: Use n8n Chat Hub API to send agent responses
      // For now, we'll use a webhook endpoint
      
      const response = await axios.post(`${this.n8nBaseUrl}/webhook/chat-response`, {
        sessionId: message.sessionId,
        message: message.content,
        timestamp: message.timestamp,
        metadata: message.metadata
      }, {
        timeout: 5000
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Failed to forward message to n8n:', error);
      
      // Try alternative approach via Chat Hub API when available
      throw error;
    }
  }

  private async handleSystemMessage(message: ChatMessage): Promise<any> {
    try {
      console.log(`📢 System message: ${message.content}`);
      
      // Handle different system message types
      if (message.metadata?.type === 'session_start') {
        await this.createSession(message.sessionId, message.metadata);
      } else if (message.metadata?.type === 'session_end') {
        await this.endSession(message.sessionId);
      } else if (message.metadata?.type === 'workflow_execution') {
        // Log workflow execution for transparency
        await this.logWorkflowExecution(message.metadata);
      }
      
      return { handled: true };
      
    } catch (error) {
      console.error('Failed to handle system message:', error);
      throw error;
    }
  }

  private handleGatewayMessage(message: any): void {
    try {
      if (message.type === 'agent_response') {
        this.emit('agentResponse', message.data);
      } else if (message.type === 'system_event') {
        this.emit('systemEvent', message.data);
      } else if (message.type === 'session_update') {
        this.updateSessionFromGateway(message.data);
      }
      
    } catch (error) {
      console.error('Failed to handle gateway message:', error);
    }
  }

  private async createSession(sessionId: string, metadata?: Record<string, any>): Promise<void> {
    const session: ChatSession = {
      id: sessionId,
      userId: metadata?.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true,
      metadata
    };
    
    this.sessions.set(sessionId, session);
    this.status.activeSessions = this.sessions.size;
    
    console.log(`📝 Created chat session: ${sessionId}`);
  }

  private async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      session.updated_at = new Date().toISOString();
      
      // Archive session after a delay
      setTimeout(() => {
        this.sessions.delete(sessionId);
        this.status.activeSessions = this.sessions.size;
      }, 300000); // 5 minutes
      
      console.log(`📝 Ended chat session: ${sessionId}`);
    }
  }

  private async updateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updated_at = new Date().toISOString();
    } else {
      // Create session if it doesn't exist
      await this.createSession(sessionId);
    }
  }

  private updateSessionFromGateway(sessionData: any): void {
    const existingSession = this.sessions.get(sessionData.id);
    if (existingSession) {
      Object.assign(existingSession, sessionData);
    } else {
      this.sessions.set(sessionData.id, sessionData);
      this.status.activeSessions = this.sessions.size;
    }
  }

  private async handleSystemEvent(event: any): Promise<void> {
    try {
      console.log('📢 System event:', event);
      
      // Forward relevant system events to both n8n and gateway
      if (event.type === 'skill_executed' || event.type === 'workflow_completed') {
        // These events provide transparency into agent actions
        await this.broadcastTransparencyEvent(event);
      }
      
    } catch (error) {
      console.error('Failed to handle system event:', error);
    }
  }

  private async logWorkflowExecution(metadata: any): Promise<void> {
    try {
      // Log workflow executions for transparency
      console.log('🔧 Workflow execution:', {
        workflowId: metadata.workflowId,
        executionId: metadata.executionId,
        status: metadata.status,
        timestamp: metadata.timestamp
      });
      
      // TODO: Store execution logs in Data Tables for user visibility
      
    } catch (error) {
      console.error('Failed to log workflow execution:', error);
    }
  }

  private async broadcastTransparencyEvent(event: any): Promise<void> {
    try {
      // Send transparency events to Chat Hub so users can see what the agent is doing
      const transparencyMessage: ChatMessage = {
        sessionId: event.sessionId || 'system',
        role: 'system',
        content: `🔍 ${event.description || 'Agent action performed'}`,
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'transparency',
          event
        }
      };
      
      await this.forwardToN8n(transparencyMessage);
      
    } catch (error) {
      console.error('Failed to broadcast transparency event:', error);
    }
  }

  public async getActiveSessions(): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).filter(session => session.active);
  }

  public async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      // TODO: Implement session history retrieval from conversations Data Table
      return [];
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }

  public getStatus(): BridgeStatus {
    return { ...this.status };
  }

  public async disable(): Promise<void> {
    this.status.enabled = false;
    
    if (this.n8nWebSocket) {
      this.n8nWebSocket.close();
    }
    
    if (this.gatewayWebSocket) {
      this.gatewayWebSocket.close();
    }
    
    console.log('🛑 Chat bridge disabled');
  }

  public async enable(): Promise<void> {
    this.status.enabled = true;
    
    await this.setupN8nConnection();
    await this.setupGatewayConnection();
    
    console.log('✅ Chat bridge enabled');
  }
}