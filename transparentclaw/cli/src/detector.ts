import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface SystemInfo {
  platform: string;
  release: string;
  arch: string;
  totalMemory: number;
  availablePorts: number[];
}

export interface DockerInfo {
  installed: boolean;
  version?: string;
  compose: boolean;
  running: boolean;
}

export async function detectSystem(): Promise<SystemInfo> {
  const platform = os.platform();
  const release = os.release();
  const arch = os.arch();
  const totalMemory = Math.round(os.totalmem() / (1024 ** 3)); // GB

  // Check available ports (basic check for common ports)
  const commonPorts = [3100, 5678, 5432, 8080, 3000];
  const availablePorts: number[] = [];

  for (const port of commonPorts) {
    try {
      // Simple port availability check
      const { stdout } = await execAsync(getPortCheckCommand(port));
      if (!isPortInUse(stdout, port)) {
        availablePorts.push(port);
      }
    } catch {
      // If command fails, assume port is available
      availablePorts.push(port);
    }
  }

  return {
    platform,
    release,
    arch,
    totalMemory,
    availablePorts
  };
}

export async function checkDockerAvailability(): Promise<DockerInfo> {
  let installed = false;
  let version: string | undefined;
  let compose = false;
  let running = false;

  try {
    // Check Docker installation
    const dockerVersionCmd = await execAsync('docker --version');
    installed = true;
    version = dockerVersionCmd.stdout.trim();
    
    // Check if Docker daemon is running
    try {
      await execAsync('docker info');
      running = true;
    } catch {
      running = false;
    }

    // Check Docker Compose
    try {
      await execAsync('docker compose version');
      compose = true;
    } catch {
      // Try legacy docker-compose
      try {
        await execAsync('docker-compose --version');
        compose = true;
      } catch {
        compose = false;
      }
    }

  } catch (error) {
    // Docker not installed
    installed = false;
  }

  return {
    installed,
    version,
    compose,
    running
  };
}

function getPortCheckCommand(port: number): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return `netstat -an | find ":${port}"`;
  } else {
    return `netstat -ln | grep :${port}`;
  }
}

function isPortInUse(output: string, port: number): boolean {
  if (!output || output.trim() === '') {
    return false;
  }
  
  const lines = output.split('\n');
  return lines.some(line => {
    const trimmed = line.trim();
    return trimmed.includes(`:${port}`) && 
           (trimmed.includes('LISTEN') || trimmed.includes('LISTENING'));
  });
}

export async function installDocker(): Promise<boolean> {
  const platform = os.platform();
  
  try {
    if (platform === 'linux') {
      // Ubuntu/Debian Docker installation
      console.log('Installing Docker on Linux...');
      await execAsync('curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh');
      
      // Add user to docker group
      const username = os.userInfo().username;
      await execAsync(`sudo usermod -aG docker ${username}`);
      
      return true;
    } else if (platform === 'darwin') {
      throw new Error('Please install Docker Desktop for Mac from https://docker.com/products/docker-desktop');
    } else if (platform === 'win32') {
      throw new Error('Please install Docker Desktop for Windows from https://docker.com/products/docker-desktop');
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('Docker installation failed:', error);
    return false;
  }
}

export function validateApiKey(key: string, provider: 'anthropic' | 'openai'): boolean {
  if (!key || typeof key !== 'string') return false;
  
  if (provider === 'anthropic') {
    return key.startsWith('sk-ant-') && key.length > 20;
  } else if (provider === 'openai') {
    return key.startsWith('sk-') && key.length > 20;
  }
  
  return false;
}

export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      const { stdout } = await execAsync(getPortCheckCommand(port));
      if (!isPortInUse(stdout, port)) {
        return port;
      }
    } catch {
      return port; // If command fails, assume port is available
    }
  }
  
  throw new Error(`No available ports found starting from ${startPort}`);
}

export async function checkPorts(ports: number[]): Promise<{ port: number; available: boolean }[]> {
  const results = [];
  
  for (const port of ports) {
    try {
      const { stdout } = await execAsync(getPortCheckCommand(port));
      const available = !isPortInUse(stdout, port);
      results.push({ port, available });
    } catch {
      // If command fails, assume port is available
      results.push({ port, available: true });
    }
  }
  
  return results;
}

export async function checkNetwork(): Promise<{
  dockerHub: boolean;
  internet: boolean;
}> {
  let dockerHub = false;
  let internet = false;

  try {
    // Check internet connectivity
    await execAsync('ping -c 1 8.8.8.8', { timeout: 5000 });
    internet = true;
  } catch {
    // Try Windows ping format
    try {
      await execAsync('ping -n 1 8.8.8.8', { timeout: 5000 });
      internet = true;
    } catch {
      internet = false;
    }
  }

  try {
    // Check Docker Hub connectivity
    await execAsync('curl -s --max-time 10 https://registry-1.docker.io/v2/', { timeout: 10000 });
    dockerHub = true;
  } catch {
    // Try with ping as fallback
    try {
      await execAsync('ping -c 1 registry-1.docker.io', { timeout: 5000 });
      dockerHub = true;
    } catch {
      try {
        await execAsync('ping -n 1 registry-1.docker.io', { timeout: 5000 });
        dockerHub = true;
      } catch {
        dockerHub = false;
      }
    }
  }

  return { dockerHub, internet };
}