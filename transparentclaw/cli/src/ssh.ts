import { Client, ConnectConfig } from 'ssh2';
import { readFile } from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const pipelineAsync = promisify(pipeline);

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  keyPath?: string;
}

export interface RemoteSystemInfo {
  platform: string;
  arch: string;
  totalMemory: number;
  dockerInstalled: boolean;
  dockerVersion?: string;
  availablePorts: number[];
}

export class SSHDeployer {
  private config: SSHConfig;
  private client: Client;
  private connected: boolean = false;

  constructor(config: SSHConfig) {
    this.config = config;
    this.client = new Client();
  }

  public static async getSSHConfig(): Promise<SSHConfig> {
    const questions = [
      {
        type: 'input',
        name: 'host',
        message: 'Remote server hostname/IP:',
        validate: (input: string) => input.trim().length > 0 || 'Hostname is required'
      },
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        default: 'ubuntu',
        validate: (input: string) => input.trim().length > 0 || 'Username is required'
      },
      {
        type: 'list',
        name: 'authMethod',
        message: 'Authentication method:',
        choices: [
          { name: 'SSH Key file (recommended)', value: 'key' },
          { name: 'Password', value: 'password' }
        ]
      }
    ];

    const basicAnswers = await inquirer.prompt(questions);
    
    const config: SSHConfig = {
      host: basicAnswers.host,
      username: basicAnswers.username,
      port: 22
    };

    if (basicAnswers.authMethod === 'key') {
      const keyQuestions = [
        {
          type: 'input',
          name: 'keyPath',
          message: 'SSH private key path:',
          default: '~/.ssh/id_rsa',
          validate: async (input: string) => {
            const expandedPath = input.replace('~', process.env.HOME || process.env.USERPROFILE || '');
            if (!existsSync(expandedPath)) {
              return `Key file not found: ${expandedPath}`;
            }
            return true;
          }
        }
      ];
      
      const keyAnswers = await inquirer.prompt(keyQuestions);
      config.keyPath = keyAnswers.keyPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');
      
      if (config.keyPath) {
        try {
          config.privateKey = await readFile(config.keyPath);
        } catch (error) {
          throw new Error(`Failed to read SSH key: ${error}`);
        }
      } else {
        throw new Error('SSH key path is required');
      }
    } else {
      const passwordQuestions = [
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: (input: string) => input.length > 0 || 'Password is required'
        }
      ];
      
      const passwordAnswers = await inquirer.prompt(passwordQuestions);
      config.password = passwordAnswers.password;
    }

    return config;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectConfig: ConnectConfig = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.username
      };

      if (this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey;
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
      }

      this.client.on('ready', () => {
        this.connected = true;
        resolve();
      });

      this.client.on('error', (error) => {
        reject(new Error(`SSH connection failed: ${error.message}`));
      });

      this.client.connect(connectConfig);
    });
  }

  public async disconnect(): Promise<void> {
    if (this.connected) {
      this.client.end();
      this.connected = false;
    }
  }

  public async executeCommand(command: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to SSH server');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`Command execution failed: ${err.message}`));
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number, signal: string) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Command failed (exit code ${code}): ${stderr || stdout}`));
          }
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });
  }

  public async uploadFile(localPath: string, remotePath: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SSH server');
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(new Error(`SFTP initialization failed: ${err.message}`));
          return;
        }

        const readStream = createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on('close', () => {
          resolve();
        });

        writeStream.on('error', (error: Error) => {
          reject(new Error(`File upload failed: ${error.message}`));
        });

        readStream.pipe(writeStream);
      });
    });
  }

  public async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SSH server');
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(new Error(`SFTP initialization failed: ${err.message}`));
          return;
        }

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = createWriteStream(localPath);

        writeStream.on('close', () => {
          resolve();
        });

        writeStream.on('error', (error: Error) => {
          reject(new Error(`File download failed: ${error.message}`));
        });

        readStream.on('error', (error: Error) => {
          reject(new Error(`Remote file read failed: ${error.message}`));
        });

        readStream.pipe(writeStream);
      });
    });
  }

  public async detectSystem(): Promise<RemoteSystemInfo> {
    const spinner = ora('Analyzing remote system...').start();

    try {
      // Get basic system info
      const platform = await this.executeCommand('uname -s');
      const arch = await this.executeCommand('uname -m');
      
      // Get memory info (in GB)
      const memInfo = await this.executeCommand('free -g | grep "Mem:" | awk \'{print $2}\'');
      const totalMemory = parseInt(memInfo.trim()) || 0;

      // Check Docker installation
      let dockerInstalled = false;
      let dockerVersion: string | undefined;

      try {
        dockerVersion = await this.executeCommand('docker --version');
        dockerInstalled = true;
      } catch {
        dockerInstalled = false;
      }

      // Check available ports
      const commonPorts = [3100, 5678, 5432, 8080, 3000];
      const availablePorts: number[] = [];

      for (const port of commonPorts) {
        try {
          await this.executeCommand(`netstat -ln | grep :${port}`);
          // Port is in use
        } catch {
          // Port is available (command failed)
          availablePorts.push(port);
        }
      }

      spinner.succeed(chalk.green('Remote system analyzed'));

      return {
        platform: platform.trim(),
        arch: arch.trim(),
        totalMemory,
        dockerInstalled,
        dockerVersion: dockerVersion?.trim(),
        availablePorts
      };

    } catch (error) {
      spinner.fail(chalk.red('System analysis failed'));
      throw error;
    }
  }

  public async installDocker(): Promise<boolean> {
    const spinner = ora('Installing Docker on remote server...').start();

    try {
      // Update package index
      await this.executeCommand('sudo apt-get update');
      
      // Install prerequisites
      await this.executeCommand('sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release');
      
      // Add Docker GPG key
      await this.executeCommand('curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg');
      
      // Add Docker repository
      const arch = await this.executeCommand('dpkg --print-architecture');
      const release = await this.executeCommand('lsb_release -cs');
      
      await this.executeCommand(`echo "deb [arch=${arch.trim()} signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu ${release.trim()} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`);
      
      // Install Docker
      await this.executeCommand('sudo apt-get update');
      await this.executeCommand('sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin');
      
      // Add user to docker group
      await this.executeCommand(`sudo usermod -aG docker ${this.config.username}`);
      
      // Start and enable Docker
      await this.executeCommand('sudo systemctl start docker');
      await this.executeCommand('sudo systemctl enable docker');
      
      spinner.succeed(chalk.green('Docker installed successfully'));
      return true;

    } catch (error) {
      spinner.fail(chalk.red(`Docker installation failed: ${error instanceof Error ? error.message : error}`));
      return false;
    }
  }

  public async deployTransparentClaw(composeContent: string, deploymentDir: string = '/home/transparentclaw'): Promise<void> {
    const spinner = ora('Deploying TransparentClaw to remote server...').start();

    try {
      // Create deployment directory
      await this.executeCommand(`mkdir -p ${deploymentDir}`);
      
      // Create volume directories
      await this.executeCommand(`mkdir -p ${deploymentDir}/volumes/n8n`);
      await this.executeCommand(`mkdir -p ${deploymentDir}/volumes/postgres`);
      await this.executeCommand(`mkdir -p ${deploymentDir}/agent-data`);
      
      // Upload docker-compose.yml
      const tempComposePath = '/tmp/docker-compose.yml.tmp';
      await require('fs/promises').writeFile(tempComposePath, composeContent);
      await this.uploadFile(tempComposePath, `${deploymentDir}/docker-compose.yml`);
      
      // Change to deployment directory
      const cdCommand = `cd ${deploymentDir}`;
      
      // Pull images
      spinner.text = 'Pulling Docker images...';
      await this.executeCommand(`${cdCommand} && docker compose pull`);
      
      // Start services
      spinner.text = 'Starting services...';
      await this.executeCommand(`${cdCommand} && docker compose up -d`);
      
      // Wait for services to be ready
      spinner.text = 'Waiting for services to start...';
      await this.waitForServices(deploymentDir);
      
      spinner.succeed(chalk.green('TransparentClaw deployed successfully'));

    } catch (error) {
      spinner.fail(chalk.red('Deployment failed'));
      throw error;
    }
  }

  private async waitForServices(deploymentDir: string, maxWaitTime: number = 120000): Promise<void> {
    const checkInterval = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if all services are healthy
        const status = await this.executeCommand(`cd ${deploymentDir} && docker compose ps --format json`);
        const services = JSON.parse(status);
        
        const allHealthy = services.every((service: any) => 
          service.State === 'running' && service.Health === 'healthy'
        );
        
        if (allHealthy) {
          return;
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (error) {
        // Services not ready yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error('Services failed to start within the expected time');
  }

  public async setupFirewall(ports: number[]): Promise<void> {
    const spinner = ora('Configuring firewall...').start();

    try {
      // Check if ufw is available
      try {
        await this.executeCommand('which ufw');
      } catch {
        spinner.stop();
        console.log(chalk.yellow('UFW not available, skipping firewall configuration'));
        return;
      }

      // Enable UFW if not already enabled
      await this.executeCommand('sudo ufw --force enable');
      
      // Allow SSH (to prevent lockout)
      await this.executeCommand('sudo ufw allow ssh');
      
      // Allow required ports
      for (const port of ports) {
        await this.executeCommand(`sudo ufw allow ${port}`);
      }
      
      spinner.succeed(chalk.green('Firewall configured'));

    } catch (error) {
      spinner.warn(chalk.yellow(`Firewall configuration failed: ${error instanceof Error ? error.message : error}`));
    }
  }

  public async getPublicIP(): Promise<string | null> {
    try {
      const ip = await this.executeCommand('curl -s ipinfo.io/ip');
      return ip.trim();
    } catch {
      return null;
    }
  }

  public async checkServices(deploymentDir: string): Promise<{ service: string; status: string }[]> {
    try {
      const output = await this.executeCommand(`cd ${deploymentDir} && docker compose ps --format json`);
      const services = JSON.parse(output);
      
      return services.map((service: any) => ({
        service: service.Name,
        status: service.State
      }));
      
    } catch (error) {
      throw new Error(`Failed to check remote services: ${error instanceof Error ? error.message : error}`);
    }
  }
}