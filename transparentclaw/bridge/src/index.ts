import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { MemorySync } from './memory-sync.js';
import { SkillSync } from './skill-sync.js';
import { ToolProxy } from './tool-proxy.js';
import { ChatBridge } from './chat-bridge.js';

const app = express();
const server = createServer(app);
const port = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'transparentclaw-bridge',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      n8nUrl: process.env.N8N_BASE_URL || 'http://n8n:5678',
      gatewayUrl: process.env.GATEWAY_BASE_URL || 'http://gateway:3100',
      syncInterval: process.env.SYNC_INTERVAL_MS || '5000'
    }
  });
});

// Bridge service status
app.get('/status', (req: Request, res: Response) => {
  res.json({
    services: {
      memorySync: MemorySync.getInstance().getStatus(),
      skillSync: SkillSync.getInstance().getStatus(),
      toolProxy: ToolProxy.getInstance().getStatus(),
      chatBridge: ChatBridge.getInstance().getStatus()
    },
    metrics: {
      totalSyncs: 0, // TODO: Implement metrics
      errorCount: 0,
      lastSync: null
    }
  });
});

// Memory sync endpoints
app.get('/memory/sync', async (req: Request, res: Response) => {
  try {
    const memorySync = MemorySync.getInstance();
    const result = await memorySync.performSync();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Memory sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/memory/update', async (req: Request, res: Response) => {
  try {
    const { table, data } = req.body;
    const memorySync = MemorySync.getInstance();
    const result = await memorySync.updateMemory(table, data);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Memory update error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Skill sync endpoints
app.get('/skills/sync', async (req: Request, res: Response) => {
  try {
    const skillSync = SkillSync.getInstance();
    const result = await skillSync.performSync();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Skill sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/skills/register', async (req: Request, res: Response) => {
  try {
    const skillData = req.body;
    const skillSync = SkillSync.getInstance();
    const result = await skillSync.registerSkill(skillData);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Skill registration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Tool proxy endpoints
app.post('/tools/execute', async (req: Request, res: Response) => {
  try {
    const { toolName, parameters } = req.body;
    const toolProxy = ToolProxy.getInstance();
    const result = await toolProxy.executeTool(toolName, parameters);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/tools/list', async (req: Request, res: Response) => {
  try {
    const toolProxy = ToolProxy.getInstance();
    const tools = await toolProxy.listAvailableTools();
    res.json({ success: true, tools });
  } catch (error) {
    console.error('Tool list error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Chat bridge endpoints
app.post('/chat/message', async (req: Request, res: Response) => {
  try {
    const messageData = req.body;
    const chatBridge = ChatBridge.getInstance();
    const result = await chatBridge.forwardMessage(messageData);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Initialize bridge services
async function initializeBridge(): Promise<void> {
  try {
    console.log('🌉 Initializing TransparentClaw Bridge...');
    
    // Initialize sync services
    const memorySync = MemorySync.getInstance();
    const skillSync = SkillSync.getInstance();
    const toolProxy = ToolProxy.getInstance();
    const chatBridge = ChatBridge.getInstance();
    
    // Start background sync processes
    await memorySync.initialize();
    await skillSync.initialize();
    await toolProxy.initialize();
    await chatBridge.initialize();
    
    console.log('✅ Bridge services initialized');
    
    // Start periodic sync
    const syncInterval = parseInt(process.env.SYNC_INTERVAL_MS || '5000');
    setInterval(async () => {
      try {
        await memorySync.performSync();
        await skillSync.performSync();
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, syncInterval);
    
    console.log(`🔄 Periodic sync started (${syncInterval}ms interval)`);
    
  } catch (error) {
    console.error('❌ Bridge initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('📴 Bridge server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('📴 Bridge server closed');
    process.exit(0);
  });
});

// Start the server
async function startServer(): Promise<void> {
  try {
    await initializeBridge();
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`🌉 TransparentClaw Bridge running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`📈 Status: http://localhost:${port}/status`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start bridge server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { app, server };