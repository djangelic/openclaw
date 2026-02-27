import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DeploymentConfig } from './installer.js';

export class Deployer {
  private config: DeploymentConfig;
  private composePath: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.composePath = join(process.cwd(), 'docker-compose.yml');
  }

  public async generateDockerCompose(): Promise<void> {
    const spinner = ora('Generating docker-compose.yml...').start();

    try {
      const composeContent = this.buildComposeContent();
      
      // Ensure directory exists
      await mkdir(dirname(this.composePath), { recursive: true });
      
      // Write docker-compose.yml
      await writeFile(this.composePath, composeContent);
      
      // Create volume directories
      await this.createVolumeDirectories();
      
      spinner.succeed(chalk.green('Docker Compose configuration generated'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate docker-compose.yml'));
      throw error;
    }
  }

  public async deploy(): Promise<void> {
    const spinner = ora('Deploying TransparentClaw services...').start();

    try {
      // Pull images first
      spinner.text = 'Pulling Docker images...';
      execSync('docker compose pull', { stdio: 'pipe' });
      
      // Start services
      spinner.text = 'Starting services...';
      execSync('docker compose up -d', { stdio: 'pipe' });
      
      // Wait for services to be healthy
      spinner.text = 'Waiting for services to start...';
      await this.waitForServices();
      
      spinner.succeed(chalk.green('Services deployed successfully'));
      
    } catch (error) {
      spinner.fail(chalk.red('Deployment failed'));
      throw error;
    }
  }

  private buildComposeContent(): string {
    const envVars = this.buildEnvironmentVariables();
    
    return `# TransparentClaw Docker Compose Configuration
# Generated on ${new Date().toISOString()}
# Agent: ${this.config.agentName}

version: '3.8'

services:
  # PostgreSQL Database - Shared between n8n and OpenClaw Gateway
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: transparentclaw
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-secure_default_password_change_me}
    volumes:
      - ${this.config.volumes.postgresData}:/var/lib/postgresql/data
    networks:
      - transparentclaw-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n -d transparentclaw"]
      interval: 10s
      timeout: 5s
      retries: 5

  # n8n - Workflow Engine with Chat Hub
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "${this.config.ports.n8n}:5678"
    environment:
${envVars.n8n.map(env => `      ${env}`).join('\n')}
    volumes:
      - ${this.config.volumes.n8nData}:/home/node/.n8n
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - transparentclaw-network
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  # OpenClaw Gateway - Agent Runtime & Session Management
  gateway:
    image: transparentclaw/gateway:latest
    build:
      context: ./bridge
      dockerfile: Dockerfile
    ports:
      - "${this.config.ports.gateway}:3100"
    environment:
${envVars.gateway.map(env => `      ${env}`).join('\n')}
    volumes:
      - ./agent-data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - transparentclaw-network
    depends_on:
      postgres:
        condition: service_healthy
      n8n:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Bridge Service - Syncs OpenClaw ↔ n8n
  bridge:
    image: transparentclaw/bridge:latest
    build:
      context: ./bridge
      dockerfile: Dockerfile
    environment:
${envVars.bridge.map(env => `      ${env}`).join('\n')}
    networks:
      - transparentclaw-network
    depends_on:
      postgres:
        condition: service_healthy
      n8n:
        condition: service_healthy
      gateway:
        condition: service_healthy
    restart: unless-stopped

networks:
  transparentclaw-network:
    driver: bridge

volumes:
  postgres-data:
  n8n-data:
  agent-data:
`;
  }

  private buildEnvironmentVariables(): {
    n8n: string[];
    gateway: string[];
    bridge: string[];
  } {
    const baseUrl = this.config.externalUrl || `http://localhost:${this.config.ports.n8n}`;
    
    return {
      n8n: [
        // Database connection
        'DB_TYPE=postgresdb',
        'DB_POSTGRESDB_HOST=postgres',
        'DB_POSTGRESDB_PORT=5432',
        'DB_POSTGRESDB_DATABASE=transparentclaw',
        'DB_POSTGRESDB_USER=n8n',
        'DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-secure_default_password_change_me}',
        
        // n8n configuration
        `N8N_BASIC_AUTH_ACTIVE=false`,
        `N8N_HOST=${baseUrl}`,
        `WEBHOOK_URL=${baseUrl}/`,
        `N8N_EDITOR_BASE_URL=${baseUrl}/`,
        
        // Chat Hub configuration
        'N8N_CHAT_ENABLED=true',
        'N8N_CHAT_PUBLIC_URL=' + baseUrl,
        
        // Embed/White-label settings (when available)
        'N8N_TEMPLATES_ENABLED=true',
        'N8N_ONBOARDING_CALL_PROMPT_ENABLED=false',
        'N8N_PERSONALIZATION_ENABLED=false',
        
        // Security
        'N8N_SECURE_COOKIE=false',
        'N8N_LOG_LEVEL=info',
        
        // Enable community nodes
        'N8N_COMMUNITY_PACKAGES_ENABLED=true'
      ],
      
      gateway: [
        // Database connection
        'DATABASE_URL=postgresql://n8n:${POSTGRES_PASSWORD:-secure_default_password_change_me}@postgres:5432/transparentclaw',
        
        // Service configuration
        'PORT=3100',
        'NODE_ENV=production',
        
        // n8n integration
        `N8N_BASE_URL=http://n8n:5678`,
        'N8N_API_KEY=${N8N_API_KEY:-}',
        
        // Agent configuration
        `AGENT_NAME=${this.config.agentName || 'TransparentClaw'}`,
        'DEFAULT_MODEL=anthropic/claude-3-sonnet-20240229',
        
        // API keys (will be set during bootstrap)
        'ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}',
        'OPENAI_API_KEY=${OPENAI_API_KEY:-}'
      ],
      
      bridge: [
        // Database connection
        'DATABASE_URL=postgresql://n8n:${POSTGRES_PASSWORD:-secure_default_password_change_me}@postgres:5432/transparentclaw',
        
        // Service endpoints
        `N8N_BASE_URL=http://n8n:5678`,
        `GATEWAY_BASE_URL=http://gateway:3100`,
        
        // Sync configuration
        'SYNC_INTERVAL_MS=5000',
        'ENABLE_MEMORY_SYNC=true',
        'ENABLE_SKILL_SYNC=true',
        
        // Logging
        'LOG_LEVEL=info'
      ]
    };
  }

  private async createVolumeDirectories(): Promise<void> {
    const dirs = [
      this.config.volumes.n8nData,
      this.config.volumes.postgresData,
      './agent-data',
      './agent-data/memory',
      './agent-data/skills'
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  private async waitForServices(): Promise<void> {
    const maxWaitTime = 120000; // 2 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if n8n is responding
        execSync(`curl -f http://localhost:${this.config.ports.n8n}/healthz`, { stdio: 'pipe' });
        
        // Check if gateway is responding
        execSync(`curl -f http://localhost:${this.config.ports.gateway}/health`, { stdio: 'pipe' });
        
        return; // All services are healthy
        
      } catch (error) {
        // Services not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error('Services failed to start within the expected time');
  }

  public async stop(): Promise<void> {
    const spinner = ora('Stopping TransparentClaw services...').start();
    
    try {
      execSync('docker compose down', { stdio: 'pipe' });
      spinner.succeed(chalk.green('Services stopped'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to stop services'));
      throw error;
    }
  }

  public async restart(): Promise<void> {
    const spinner = ora('Restarting TransparentClaw services...').start();
    
    try {
      execSync('docker compose restart', { stdio: 'pipe' });
      
      // Wait for services to be healthy again
      spinner.text = 'Waiting for services to restart...';
      await this.waitForServices();
      
      spinner.succeed(chalk.green('Services restarted'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to restart services'));
      throw error;
    }
  }

  public async getStatus(): Promise<{ service: string; status: string }[]> {
    try {
      const output = execSync('docker compose ps --format json', { encoding: 'utf-8' });
      const services = JSON.parse(output);
      
      return services.map((service: any) => ({
        service: service.Name,
        status: service.State
      }));
      
    } catch (error) {
      throw new Error('Failed to get service status');
    }
  }
}