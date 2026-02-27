import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Deployer } from './deployer.js';
import { NetworkingSetup } from './networking.js';
import { Bootstrap } from './bootstrap.js';
import { SystemInfo, DockerInfo, installDocker, findAvailablePort } from './utils.js';

export interface DeploymentConfig {
  type: 'local' | 'remote';
  networking: 'tailscale' | 'cloudflare' | 'ngrok' | 'none';
  ports: {
    n8n: number;
    gateway: number;
    postgres: number;
  };
  volumes: {
    n8nData: string;
    postgresData: string;
  };
  environment: Record<string, string>;
  agentName?: string;
  externalUrl?: string;
  sshConfig?: {
    host: string;
    username: string;
    keyPath?: string;
    password?: string;
  };
}

interface InstallerConfig {
  apiKey: string;
  provider: 'anthropic' | 'openai';
  systemInfo: SystemInfo;
  dockerInfo: DockerInfo;
  options: {
    deployment?: 'local' | 'remote';
    networking?: 'tailscale' | 'cloudflare' | 'ngrok' | 'none';
    force?: boolean;
  };
}

export class AIInstaller {
  private client: Anthropic | OpenAI;
  private config: InstallerConfig;
  private deploymentConfig?: DeploymentConfig;

  constructor(config: InstallerConfig) {
    this.config = config;
    
    if (config.provider === 'anthropic') {
      this.client = new Anthropic({
        apiKey: config.apiKey
      });
    } else {
      this.client = new OpenAI({
        apiKey: config.apiKey
      });
    }
  }

  public async start(): Promise<void> {
    console.log(chalk.blue('\n🤖 Starting AI-guided installation...\n'));
    
    try {
      await this.analyzeSystem();
      await this.gatherRequirements();
      await this.generateDeploymentPlan();
      await this.executeDeployment();
      await this.setupNetworking();
      await this.bootstrapAgent();
      await this.finalizeInstallation();
      
      console.log(chalk.green.bold('\n🎉 TransparentClaw installation complete!'));
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  private async analyzeSystem(): Promise<void> {
    const spinner = ora('Analyzing system capabilities...').start();
    
    try {
      // Check if Docker needs to be installed
      if (!this.config.dockerInfo.installed) {
        spinner.warn(chalk.yellow('Docker not found'));
        
        const installResponse = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'installDocker',
            message: 'Docker is required. Should I install it for you?',
            default: true
          }
        ]);
        
        if (installResponse.installDocker) {
          spinner.start('Installing Docker...');
          const installed = await installDocker();
          if (!installed) {
            throw new Error('Docker installation failed. Please install Docker manually and try again.');
          }
          spinner.succeed('Docker installed successfully');
        } else {
          throw new Error('Docker is required for TransparentClaw. Please install Docker and try again.');
        }
      }

      // Check Docker daemon
      if (!this.config.dockerInfo.running) {
        spinner.warn(chalk.yellow('Docker daemon not running'));
        console.log(chalk.yellow('\n⚠️  Docker daemon is not running. Please start Docker and try again.'));
        
        if (process.platform === 'win32' || process.platform === 'darwin') {
          console.log(chalk.gray('  Start Docker Desktop application'));
        } else {
          console.log(chalk.gray('  Run: sudo systemctl start docker'));
        }
        
        throw new Error('Docker daemon not running');
      }

      // Memory check
      if (this.config.systemInfo.totalMemory < 4) {
        spinner.warn(chalk.yellow('Low memory detected'));
        console.log(chalk.yellow(`\n⚠️  Only ${this.config.systemInfo.totalMemory}GB RAM available. Recommended: 4GB+`));
        
        const continueResponse = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: 'Continue with limited memory?',
            default: false
          }
        ]);
        
        if (!continueResponse.continue) {
          throw new Error('Installation cancelled due to insufficient memory');
        }
      }

      spinner.succeed(chalk.green('System analysis complete'));
    } catch (error) {
      spinner.fail(chalk.red('System analysis failed'));
      throw error;
    }
  }

  private async gatherRequirements(): Promise<void> {
    console.log(chalk.blue('\n💬 Let\'s configure your deployment...\n'));

    // Get deployment preferences
    const deploymentQuestions = [
      {
        type: 'list',
        name: 'deploymentType',
        message: 'Where would you like to deploy TransparentClaw?',
        choices: [
          { name: 'Local machine (this computer)', value: 'local' },
          { name: 'Remote server (via SSH)', value: 'remote' }
        ],
        default: this.config.options.deployment || 'local'
      }
    ];

    if (!this.config.options.deployment) {
      const deploymentResponse = await inquirer.prompt(deploymentQuestions);
      this.config.options.deployment = deploymentResponse.deploymentType;
    }

    // Get networking preferences
    const networkingQuestions = [
      {
        type: 'list',
        name: 'networking',
        message: 'How would you like to access your agent externally?',
        choices: [
          { name: 'Tailscale (recommended - free, secure P2P)', value: 'tailscale' },
          { name: 'Cloudflare Tunnel (free with domain)', value: 'cloudflare' },
          { name: 'Ngrok (free tier, temporary URLs)', value: 'ngrok' },
          { name: 'Local only (no external access)', value: 'none' }
        ],
        default: this.config.options.networking || 'tailscale'
      }
    ];

    if (!this.config.options.networking) {
      const networkingResponse = await inquirer.prompt(networkingQuestions);
      this.config.options.networking = networkingResponse.networking;
    }

    // Show deployment warning for local deployments
    if (this.config.options.deployment === 'local') {
      console.log(chalk.yellow('\n⚠️  Local Deployment Notes:'));
      console.log(chalk.gray('  • Your agent will go offline when this computer sleeps/shuts down'));
      console.log(chalk.gray('  • For 24/7 operation, consider a remote server deployment'));
      console.log(chalk.gray('  • You can migrate to remote later using tclaw migrate\n'));
    }

    // Get agent name
    const agentQuestions = [
      {
        type: 'input',
        name: 'agentName',
        message: 'What would you like to name your AI agent?',
        default: 'TransparentClaw',
        validate: (input: string) => input.trim().length > 0 || 'Agent name is required'
      }
    ];

    const agentResponse = await inquirer.prompt(agentQuestions);
    
    // Initialize deployment config
    this.deploymentConfig = {
      type: this.config.options.deployment as 'local' | 'remote',
      networking: this.config.options.networking as any,
      ports: {
        n8n: await findAvailablePort(5678),
        gateway: await findAvailablePort(3100),
        postgres: 5432 // Internal only
      },
      volumes: {
        n8nData: './volumes/n8n',
        postgresData: './volumes/postgres'
      },
      environment: {},
      agentName: agentResponse.agentName
    };
  }

  private async generateDeploymentPlan(): Promise<void> {
    const spinner = ora('Generating deployment plan...').start();
    
    try {
      if (!this.deploymentConfig) {
        throw new Error('Deployment config not initialized');
      }

      // Use AI to generate a contextual deployment plan
      const systemPrompt = `You are an AI deployment assistant for TransparentClaw. 
Generate a deployment plan based on the following system information:

System: ${this.config.systemInfo.platform} ${this.config.systemInfo.arch}
Memory: ${this.config.systemInfo.totalMemory}GB
Docker: ${this.config.dockerInfo.installed ? 'Installed' : 'Not installed'}
Deployment: ${this.deploymentConfig.type}
Networking: ${this.deploymentConfig.networking}
Available Ports: ${this.config.systemInfo.availablePorts.join(', ')}

Provide a brief, encouraging message about the deployment plan.`;

      let aiResponse: string;
      
      if (this.config.provider === 'anthropic') {
        const response = await (this.client as Anthropic).messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: systemPrompt
          }]
        });
        aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';
      } else {
        const response = await (this.client as OpenAI).chat.completions.create({
          model: 'gpt-3.5-turbo',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: systemPrompt
          }]
        });
        aiResponse = response.choices[0].message.content || '';
      }

      spinner.succeed(chalk.green('Deployment plan ready'));
      
      console.log(chalk.cyan('\n📋 Deployment Plan:'));
      console.log(chalk.gray(`  ${aiResponse}`));
      console.log(chalk.blue('\n🔧 Configuration:'));
      console.log(chalk.gray(`  • n8n: http://localhost:${this.deploymentConfig.ports.n8n}`));
      console.log(chalk.gray(`  • Gateway: http://localhost:${this.deploymentConfig.ports.gateway}`));
      console.log(chalk.gray(`  • Database: Internal PostgreSQL`));
      console.log(chalk.gray(`  • Agent Name: ${this.deploymentConfig.agentName}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Plan generation failed'));
      console.log(chalk.yellow('Continuing with default plan...'));
    }
  }

  private async executeDeployment(): Promise<void> {
    if (!this.deploymentConfig) {
      throw new Error('Deployment config not initialized');
    }

    const deployer = new Deployer(this.deploymentConfig);
    await deployer.generateDockerCompose();
    await deployer.deploy();
  }

  private async setupNetworking(): Promise<void> {
    if (!this.deploymentConfig || this.deploymentConfig.networking === 'none') {
      return;
    }

    const networking = new NetworkingSetup(this.deploymentConfig);
    const externalUrl = await networking.setup();
    
    if (externalUrl) {
      this.deploymentConfig.externalUrl = externalUrl;
      console.log(chalk.green(`\n🌐 External URL: ${externalUrl}`));
    }
  }

  private async bootstrapAgent(): Promise<void> {
    if (!this.deploymentConfig) {
      throw new Error('Deployment config not initialized');
    }

    const bootstrap = new Bootstrap(this.deploymentConfig);
    await bootstrap.initialize();
  }

  private async finalizeInstallation(): Promise<void> {
    console.log(chalk.green.bold('\n✅ Installation Summary:'));
    
    if (this.deploymentConfig) {
      console.log(chalk.gray(`  Agent Name: ${this.deploymentConfig.agentName}`));
      console.log(chalk.gray(`  Local URL: http://localhost:${this.deploymentConfig.ports.n8n}`));
      
      if (this.deploymentConfig.externalUrl) {
        console.log(chalk.gray(`  External URL: ${this.deploymentConfig.externalUrl}`));
      }
      
      console.log(chalk.gray(`  Data Location: ${this.deploymentConfig.volumes.n8nData}`));
    }
    
    console.log(chalk.blue('\n🚀 Next Steps:'));
    console.log(chalk.gray('  1. Your agent is starting up (this may take a minute)'));
    console.log(chalk.gray('  2. The Chat Hub will open in your browser'));
    console.log(chalk.gray('  3. Say hello to your new AI assistant!'));
    console.log(chalk.gray('\n  Commands:'));
    console.log(chalk.gray('    tclaw status  - Check service status'));
    console.log(chalk.gray('    tclaw stop    - Stop services'));
    console.log(chalk.gray('    tclaw restart - Restart services'));
  }

  private async handleError(error: unknown): Promise<void> {
    console.error(chalk.red('\n❌ Installation Error:'));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`   ${errorMessage}`));
    
    // Use AI for error analysis and suggestions
    try {
      const errorAnalysisPrompt = `Analyze this TransparentClaw installation error and provide helpful suggestions:

Error: ${errorMessage}
System: ${this.config.systemInfo.platform}
Docker: ${this.config.dockerInfo.installed ? 'Installed' : 'Not installed'}

Provide 2-3 specific troubleshooting steps.`;

      let aiSuggestions: string;
      
      if (this.config.provider === 'anthropic') {
        const response = await (this.client as Anthropic).messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: errorAnalysisPrompt
          }]
        });
        aiSuggestions = response.content[0].type === 'text' ? response.content[0].text : '';
      } else {
        const response = await (this.client as OpenAI).chat.completions.create({
          model: 'gpt-3.5-turbo',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: errorAnalysisPrompt
          }]
        });
        aiSuggestions = response.choices[0].message.content || '';
      }

      if (aiSuggestions) {
        console.log(chalk.yellow('\n💡 Suggested Solutions:'));
        console.log(chalk.gray(`   ${aiSuggestions}`));
      }
      
    } catch (aiError) {
      console.log(chalk.yellow('\n💡 Try these common solutions:'));
      console.log(chalk.gray('   1. Ensure Docker is running: docker info'));
      console.log(chalk.gray('   2. Check if ports are available: netstat -ln | grep :5678'));
      console.log(chalk.gray('   3. Run with --force to override existing installations'));
    }
  }
}