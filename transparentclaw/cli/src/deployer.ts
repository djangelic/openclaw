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
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-n8n_password_change_me}
    volumes:
      - ${this.config.volumes.postgresData}:/var/lib/postgresql/data
    networks:
      - transparentclaw-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n -d n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

  # n8n - Workflow Engine with Chat Hub and Data Tables
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "${this.config.ports.n8n}:5678"
    environment:
${envVars.n8n.map(env => `      ${env}`).join('\n')}
    volumes:
      - ${this.config.volumes.n8nData}:/home/node/.n8n
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

  # Bootstrap - Runs once to set up n8n with workflows and agent configuration
  bootstrap:
    image: n8nio/n8n:latest
    environment:
${envVars.bootstrap.map(env => `      ${env}`).join('\n')}
    volumes:
      - ${this.config.volumes.n8nData}:/home/node/.n8n
      - ./bootstrap.sh:/bootstrap.sh:ro
    networks:
      - transparentclaw-network
    depends_on:
      n8n:
        condition: service_healthy
    command: ["sh", "/bootstrap.sh"]
    restart: "no"

networks:
  transparentclaw-network:
    driver: bridge

volumes:
  n8n-data:
  postgres-data:
`;
  }

  private buildEnvironmentVariables(): {
    n8n: string[];
    bootstrap: string[];
  } {
    const baseUrl = this.config.externalUrl || `http://localhost:${this.config.ports.n8n}`;
    
    return {
      n8n: [
        // Database connection
        'DB_TYPE=postgresdb',
        'DB_POSTGRESDB_HOST=postgres',
        'DB_POSTGRESDB_PORT=5432',
        'DB_POSTGRESDB_DATABASE=n8n',
        'DB_POSTGRESDB_USER=n8n',
        'DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-n8n_password_change_me}',
        
        // n8n configuration
        'N8N_BASIC_AUTH_ACTIVE=false',
        `N8N_HOST=${baseUrl}`,
        `WEBHOOK_URL=${baseUrl}/`,
        `N8N_EDITOR_BASE_URL=${baseUrl}/`,
        
        // Chat Hub configuration
        'N8N_CHAT_ENABLED=true',
        `N8N_CHAT_PUBLIC_URL=${baseUrl}`,
        
        // Data Tables configuration (when available)
        'N8N_DATATABLES_ENABLED=true',
        
        // Agent features
        'N8N_AI_ENABLED=true',
        
        // Embed/White-label settings
        'N8N_TEMPLATES_ENABLED=true',
        'N8N_ONBOARDING_CALL_PROMPT_ENABLED=false',
        'N8N_PERSONALIZATION_ENABLED=false',
        
        // Security
        'N8N_SECURE_COOKIE=false',
        'N8N_LOG_LEVEL=info',
        
        // Enable community nodes
        'N8N_COMMUNITY_PACKAGES_ENABLED=true',
        
        // API keys for agent functionality
        'ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}',
        'OPENAI_API_KEY=${OPENAI_API_KEY:-}',
        
        // Agent configuration
        `N8N_AGENT_NAME=${this.config.agentName || 'TransparentClaw'}`,
        'N8N_DEFAULT_MODEL=anthropic/claude-3-sonnet-20240229'
      ],
      
      bootstrap: [
        // Same database connection as n8n
        'DB_TYPE=postgresdb',
        'DB_POSTGRESDB_HOST=postgres',
        'DB_POSTGRESDB_PORT=5432',
        'DB_POSTGRESDB_DATABASE=n8n',
        'DB_POSTGRESDB_USER=n8n',
        'DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-n8n_password_change_me}',
        
        // Bootstrap configuration
        `N8N_BASE_URL=http://n8n:5678`,
        'BOOTSTRAP_MODE=true',
        
        // API keys
        'ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}',
        'OPENAI_API_KEY=${OPENAI_API_KEY:-}',
        
        // Agent configuration
        `AGENT_NAME=${this.config.agentName || 'TransparentClaw'}`
      ]
    };
  }

  private async createVolumeDirectories(): Promise<void> {
    const dirs = [
      this.config.volumes.n8nData,
      this.config.volumes.postgresData
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
        
        return; // n8n service is healthy
        
      } catch (error) {
        // Service not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error('n8n service failed to start within the expected time');
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