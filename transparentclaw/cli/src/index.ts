#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AIInstaller } from './installer.js';
import { detectSystem, checkDockerAvailability } from './utils.js';

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
    console.log(chalk.cyan('🔍 Checking TransparentClaw status...'));
    // TODO: Implement status checking
    console.log(chalk.yellow('Status checking not yet implemented'));
  });

program
  .command('stop')
  .description('Stop TransparentClaw services')
  .action(async () => {
    console.log(chalk.yellow('⏹️  Stopping TransparentClaw services...'));
    // TODO: Implement service stop
    console.log(chalk.yellow('Service stop not yet implemented'));
  });

program
  .command('restart')
  .description('Restart TransparentClaw services')
  .action(async () => {
    console.log(chalk.yellow('🔄 Restarting TransparentClaw services...'));
    // TODO: Implement service restart
    console.log(chalk.yellow('Service restart not yet implemented'));
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