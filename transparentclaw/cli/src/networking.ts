import { execSync, spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { DeploymentConfig } from './installer.js';

const execAsync = promisify(exec);

interface NetworkingProvider {
  name: string;
  setup(): Promise<string | null>;
  isInstalled(): Promise<boolean>;
  install(): Promise<boolean>;
}

export class NetworkingSetup {
  private config: DeploymentConfig;
  private provider: NetworkingProvider;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.provider = this.getProvider();
  }

  public async setup(): Promise<string | null> {
    if (this.config.networking === 'none') {
      return null;
    }

    const spinner = ora(`Setting up ${this.config.networking} networking...`).start();

    try {
      // Check if provider is installed
      const installed = await this.provider.isInstalled();
      
      if (!installed) {
        spinner.info(chalk.yellow(`${this.provider.name} not found`));
        
        const installResponse = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'install',
            message: `Install ${this.provider.name}?`,
            default: true
          }
        ]);

        if (!installResponse.install) {
          spinner.stop();
          console.log(chalk.yellow('Skipping network setup'));
          return null;
        }

        spinner.start(`Installing ${this.provider.name}...`);
        const installSuccess = await this.provider.install();
        
        if (!installSuccess) {
          spinner.fail(chalk.red(`Failed to install ${this.provider.name}`));
          return null;
        }
        
        spinner.succeed(chalk.green(`${this.provider.name} installed`));
      }

      // Setup networking
      spinner.start(`Configuring ${this.provider.name}...`);
      const externalUrl = await this.provider.setup();
      
      if (externalUrl) {
        spinner.succeed(chalk.green(`External access configured: ${externalUrl}`));
        return externalUrl;
      } else {
        spinner.stop();
        console.log(chalk.yellow('Network setup completed (manual configuration required)'));
        return null;
      }

    } catch (error) {
      spinner.fail(chalk.red(`Network setup failed: ${error instanceof Error ? error.message : error}`));
      return null;
    }
  }

  private getProvider(): NetworkingProvider {
    switch (this.config.networking) {
      case 'tailscale':
        return new TailscaleProvider(this.config);
      case 'cloudflare':
        return new CloudflareProvider(this.config);
      case 'ngrok':
        return new NgrokProvider(this.config);
      default:
        throw new Error(`Unknown networking provider: ${this.config.networking}`);
    }
  }
}

class TailscaleProvider implements NetworkingProvider {
  public name = 'Tailscale';
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('tailscale version');
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      if (platform === 'linux') {
        // Install on Linux
        execSync('curl -fsSL https://tailscale.com/install.sh | sh', { stdio: 'inherit' });
        return true;
      } else if (platform === 'darwin') {
        console.log(chalk.blue('\nPlease install Tailscale manually:'));
        console.log(chalk.gray('  1. Visit: https://tailscale.com/download/mac'));
        console.log(chalk.gray('  2. Download and install Tailscale'));
        console.log(chalk.gray('  3. Run the installer again\n'));
        return false;
      } else if (platform === 'win32') {
        console.log(chalk.blue('\nPlease install Tailscale manually:'));
        console.log(chalk.gray('  1. Visit: https://tailscale.com/download/windows'));
        console.log(chalk.gray('  2. Download and install Tailscale'));
        console.log(chalk.gray('  3. Run the installer again\n'));
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Tailscale installation failed:', error);
      return false;
    }
  }

  async setup(): Promise<string | null> {
    try {
      // Check if already logged in
      try {
        const { stdout } = await execAsync('tailscale status --json');
        const status = JSON.parse(stdout);
        
        if (status.BackendState === 'Running') {
          // Already connected, get machine name
          const hostname = status.Self?.HostName || 'unknown';
          const domain = status.MagicDNSSuffix || 'unknown.ts.net';
          return `http://${hostname}.${domain}:${this.config.ports.n8n}`;
        }
      } catch {
        // Not logged in, continue with login process
      }

      console.log(chalk.blue('\n🔗 Setting up Tailscale...'));
      console.log(chalk.gray('A browser window will open for authentication.'));
      
      // Start Tailscale daemon if needed
      try {
        execSync('sudo tailscaled', { stdio: 'pipe' });
      } catch {
        // Daemon might already be running or start automatically
      }

      // Login to Tailscale
      execSync('tailscale up', { stdio: 'inherit' });
      
      // Get status after login
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);
      
      if (status.BackendState === 'Running') {
        const hostname = status.Self?.HostName || 'unknown';
        const domain = status.MagicDNSSuffix || 'unknown.ts.net';
        const url = `http://${hostname}.${domain}:${this.config.ports.n8n}`;
        
        console.log(chalk.green(`\n✅ Tailscale connected!`));
        console.log(chalk.gray(`   Your agent will be accessible at: ${url}`));
        console.log(chalk.gray(`   From any device on your Tailscale network`));
        
        return url;
      }
      
      return null;
    } catch (error) {
      console.error('Tailscale setup failed:', error);
      return null;
    }
  }
}

class CloudflareProvider implements NetworkingProvider {
  public name = 'Cloudflare Tunnel';
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('cloudflared --version');
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      if (platform === 'linux') {
        // Install cloudflared on Linux
        execSync('wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb', { stdio: 'pipe' });
        execSync('sudo dpkg -i cloudflared-linux-amd64.deb', { stdio: 'pipe' });
        return true;
      } else {
        console.log(chalk.blue(`\nPlease install cloudflared manually:`));
        console.log(chalk.gray('  Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/'));
        return false;
      }
    } catch (error) {
      console.error('Cloudflare Tunnel installation failed:', error);
      return false;
    }
  }

  async setup(): Promise<string | null> {
    try {
      // Get domain from user
      const domainResponse = await inquirer.prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'Enter your domain (registered with Cloudflare):',
          validate: (input: string) => {
            if (!input.trim()) return 'Domain is required';
            if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input)) return 'Invalid domain format';
            return true;
          }
        }
      ]);

      const subdomain = 'transparentclaw'; // or let user customize
      const fullDomain = `${subdomain}.${domainResponse.domain}`;
      
      console.log(chalk.blue('\n🔗 Setting up Cloudflare Tunnel...'));
      console.log(chalk.gray('This will create a secure tunnel to your local agent.'));
      
      // Login to Cloudflare (opens browser)
      execSync('cloudflared tunnel login', { stdio: 'inherit' });
      
      // Create tunnel
      const tunnelName = `transparentclaw-${Date.now()}`;
      execSync(`cloudflared tunnel create ${tunnelName}`, { stdio: 'pipe' });
      
      // Create DNS record
      execSync(`cloudflared tunnel route dns ${tunnelName} ${fullDomain}`, { stdio: 'pipe' });
      
      // Create tunnel configuration
      const configContent = `tunnel: ${tunnelName}
credentials-file: ~/.cloudflared/${tunnelName}.json

ingress:
  - hostname: ${fullDomain}
    service: http://localhost:${this.config.ports.n8n}
  - service: http_status:404
`;

      await require('fs/promises').writeFile('~/.cloudflared/config.yml', configContent);
      
      // Start tunnel in background
      spawn('cloudflared', ['tunnel', 'run', tunnelName], {
        detached: true,
        stdio: 'ignore'
      });

      const url = `https://${fullDomain}`;
      
      console.log(chalk.green(`\n✅ Cloudflare Tunnel configured!`));
      console.log(chalk.gray(`   Your agent will be accessible at: ${url}`));
      
      return url;
      
    } catch (error) {
      console.error('Cloudflare setup failed:', error);
      return null;
    }
  }
}

class NgrokProvider implements NetworkingProvider {
  public name = 'Ngrok';
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('ngrok version');
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      if (platform === 'linux') {
        // Install ngrok on Linux
        execSync('curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null', { stdio: 'pipe' });
        execSync('echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list', { stdio: 'pipe' });
        execSync('sudo apt update && sudo apt install ngrok', { stdio: 'pipe' });
        return true;
      } else {
        console.log(chalk.blue(`\nPlease install ngrok manually:`));
        console.log(chalk.gray('  Visit: https://ngrok.com/download'));
        return false;
      }
    } catch (error) {
      console.error('Ngrok installation failed:', error);
      return false;
    }
  }

  async setup(): Promise<string | null> {
    try {
      // Get authtoken from user
      const tokenResponse = await inquirer.prompt([
        {
          type: 'password',
          name: 'authtoken',
          message: 'Enter your ngrok authtoken (get from https://dashboard.ngrok.com/get-started/your-authtoken):',
          mask: '*',
          validate: (input: string) => input.trim().length > 0 || 'Authtoken is required'
        }
      ]);

      // Configure authtoken
      execSync(`ngrok authtoken ${tokenResponse.authtoken}`, { stdio: 'pipe' });
      
      console.log(chalk.blue('\n🔗 Starting Ngrok tunnel...'));
      console.log(chalk.yellow('⚠️  Free tier tunnels are temporary and will change on restart'));
      
      // Start ngrok tunnel in background
      const ngrokProcess = spawn('ngrok', ['http', this.config.ports.n8n.toString()], {
        detached: true,
        stdio: 'pipe'
      });

      // Give ngrok time to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get tunnel URL from API
      try {
        const { stdout } = await execAsync('curl -s http://localhost:4040/api/tunnels');
        const tunnels = JSON.parse(stdout);
        
        if (tunnels.tunnels && tunnels.tunnels.length > 0) {
          const httpsUrl = tunnels.tunnels.find((t: any) => t.proto === 'https')?.public_url;
          const httpUrl = tunnels.tunnels.find((t: any) => t.proto === 'http')?.public_url;
          const url = httpsUrl || httpUrl;
          
          if (url) {
            console.log(chalk.green(`\n✅ Ngrok tunnel active!`));
            console.log(chalk.gray(`   Your agent is accessible at: ${url}`));
            console.log(chalk.yellow(`   ⚠️  This URL will change when the tunnel restarts`));
            
            return url;
          }
        }
      } catch (error) {
        console.error('Failed to get ngrok tunnel URL:', error);
      }
      
      return null;
      
    } catch (error) {
      console.error('Ngrok setup failed:', error);
      return null;
    }
  }
}