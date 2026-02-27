#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AIInstaller } from './installer.js';
import { detectSystem, checkDockerAvailability } from './detector.js';

const program = new Command();

interface InitOptions {
  apiKey?: string;
  provider?: 'anthropic' | 'openai';
  deployment?: 'local' | 'remote';
  networking?: 'tailscale' | 'cloudflare' | 'ngrok' | 'none';
  force?: boolean;
}

program
  .name('tclaw')
  .description('TransparentClaw - Self-deploying AI agent platform')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new TransparentClaw deployment')
  .option('-k, --api-key <key>', 'AI provider API key')
  .option('-p, --provider <provider>', 'AI provider (anthropic|openai)', 'anthropic')
  .option('-d, --deployment <type>', 'Deployment type (local|remote)', 'local')
  .option('-n, --networking <type>', 'Networking setup (tailscale|cloudflare|ngrok|none)')
  .option('-f, --force', 'Force initialization even if already deployed')
  .action(async (options: InitOptions) => {
    try {
      console.log(chalk.cyan.bold('\n🚀 TransparentClaw Installer\n'));
      console.log(chalk.gray('Building your AI agent platform with n8n transparency...\n'));

      // Get API key if not provided
      let apiKey = options.apiKey;
      if (!apiKey) {
        const response = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your AI provider API key:',
            mask: '*',
            validate: (input: string) => {
              if (!input.trim()) return 'API key is required';
              if (options.provider === 'anthropic' && !input.startsWith('sk-ant-')) {
                return 'Anthropic API keys should start with sk-ant-';
              }
              if (options.provider === 'openai' && !input.startsWith('sk-')) {
                return 'OpenAI API keys should start with sk-';
              }
              return true;
            }
          }
        ]);
        apiKey = response.apiKey;
      }

      if (!apiKey) {
        throw new Error('API key is required');
      }

      // System detection
      const spinner = ora('Checking system requirements...').start();
      const systemInfo = await detectSystem();
      const dockerInfo = await checkDockerAvailability();
      
      spinner.succeed(chalk.green('System check complete'));
      
      console.log(chalk.blue('\n📋 System Information:'));
      console.log(chalk.gray(`  OS: ${systemInfo.platform} ${systemInfo.release}`));
      console.log(chalk.gray(`  Architecture: ${systemInfo.arch}`));
      console.log(chalk.gray(`  Memory: ${systemInfo.totalMemory}GB`));
      console.log(chalk.gray(`  Docker: ${dockerInfo.installed ? '✅ Installed' : '❌ Not found'}`));
      
      if (dockerInfo.installed && dockerInfo.version) {
        console.log(chalk.gray(`  Docker Version: ${dockerInfo.version}`));
        console.log(chalk.gray(`  Compose: ${dockerInfo.compose ? '✅ Available' : '❌ Missing'}`));
      }

      // Initialize AI installer
      const installer = new AIInstaller({
        apiKey,
        provider: options.provider || 'anthropic',
        systemInfo,
        dockerInfo,
        options: {
          deployment: options.deployment,
          networking: options.networking,
          force: options.force
        }
      });

      // Start AI-guided installation
      await installer.start();

    } catch (error) {
      console.error(chalk.red('\n❌ Installation failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check TransparentClaw deployment status')
  .action(async () => {
    try {
      console.log(chalk.cyan('🔍 Checking TransparentClaw status...'));
      
      const spinner = ora('Checking services...').start();
      
      // Check if Docker is running
      const dockerInfo = await checkDockerAvailability();
      if (!dockerInfo.running) {
        spinner.fail(chalk.red('Docker is not running'));
        return;
      }

      // Check if containers are running
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout } = await execAsync('docker compose ps --services --filter "status=running"');
        const runningServices = stdout.trim().split('\n').filter(s => s);
        
        if (runningServices.length === 0) {
          spinner.fail(chalk.yellow('No TransparentClaw services running'));
          console.log(chalk.gray('Run "tclaw init" to deploy TransparentClaw'));
        } else {
          spinner.succeed(chalk.green('TransparentClaw is running'));
          console.log(chalk.blue('\n📋 Running Services:'));
          runningServices.forEach(service => {
            console.log(chalk.gray(`  ✅ ${service}`));
          });
          
          // Try to get n8n URL
          try {
            const { stdout: portInfo } = await execAsync('docker compose port n8n 5678');
            const port = portInfo.trim().split(':')[1];
            console.log(chalk.green(`\n🌐 n8n available at: http://localhost:${port}`));
          } catch {
            console.log(chalk.green('\n🌐 n8n available at: http://localhost:5678'));
          }
        }
      } catch (error) {
        spinner.fail(chalk.red('Failed to check service status'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Status check failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('Show container logs')
  .option('-f, --follow', 'Follow log output')
  .option('-s, --service <service>', 'Show logs for specific service (n8n|postgres)')
  .action(async (options: { follow?: boolean; service?: string }) => {
    try {
      console.log(chalk.cyan('📜 Showing TransparentClaw logs...'));
      
      const { exec, spawn } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check if containers are running
      try {
        await execAsync('docker compose ps');
      } catch (error) {
        console.error(chalk.red('❌ No TransparentClaw deployment found'));
        console.log(chalk.gray('Run "tclaw init" to deploy TransparentClaw'));
        return;
      }

      let command = 'docker compose logs';
      if (options.follow) command += ' -f';
      if (options.service) command += ` ${options.service}`;

      if (options.follow) {
        // Use spawn for following logs
        const child = spawn('docker', ['compose', 'logs', '-f', ...(options.service ? [options.service] : [])], {
          stdio: 'inherit'
        });
        
        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
          child.kill('SIGTERM');
          process.exit(0);
        });
      } else {
        // Use exec for one-time log output
        const { stdout, stderr } = await execAsync(command);
        console.log(stdout);
        if (stderr) console.error(stderr);
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to show logs:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop TransparentClaw services')
  .action(async () => {
    try {
      console.log(chalk.yellow('⏹️  Stopping TransparentClaw services...'));
      
      const spinner = ora('Stopping containers...').start();
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('docker compose down');
      
      spinner.succeed(chalk.green('TransparentClaw services stopped'));
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to stop services:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update TransparentClaw to latest images')
  .action(async () => {
    try {
      console.log(chalk.cyan('🔄 Updating TransparentClaw...'));
      
      const spinner = ora('Pulling latest images...').start();
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Pull latest images
      await execAsync('docker compose pull');
      
      spinner.text = 'Restarting services with new images...';
      
      // Restart with new images
      await execAsync('docker compose up -d');
      
      spinner.succeed(chalk.green('TransparentClaw updated successfully'));
      console.log(chalk.blue('🌐 n8n available at: http://localhost:5678'));
    } catch (error) {
      console.error(chalk.red('\n❌ Update failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Reset agent state (with confirmation)')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options: { force?: boolean }) => {
    try {
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset TransparentClaw? This will delete all workflows and data.',
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.gray('Reset cancelled'));
          return;
        }
      }

      console.log(chalk.yellow('🔄 Resetting TransparentClaw...'));
      
      const spinner = ora('Stopping services...').start();
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Stop and remove containers, volumes
      await execAsync('docker compose down -v');
      
      spinner.text = 'Removing images...';
      
      // Remove images (optional - saves bandwidth on next deployment)
      try {
        await execAsync('docker image rm n8nio/n8n:latest postgres:16-alpine 2>/dev/null || true');
      } catch {
        // Ignore errors when removing images
      }
      
      spinner.succeed(chalk.green('TransparentClaw reset complete'));
      console.log(chalk.gray('Run "tclaw init" to deploy TransparentClaw again'));
    } catch (error) {
      console.error(chalk.red('\n❌ Reset failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  console.error(chalk.red('❌ Command failed:'), error);
  process.exit(1);
}