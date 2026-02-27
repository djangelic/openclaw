import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface Skill {
  id: string;
  name: string;
  description: string;
  workflow_id?: string;
  enabled: boolean;
  parameters?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface SyncStatus {
  enabled: boolean;
  lastSync: string | null;
  errorCount: number;
  totalSyncs: number;
  skillCount: number;
}

export class SkillSync {
  private static instance: SkillSync;
  private n8nBaseUrl: string;
  private dataPath: string;
  private status: SyncStatus;

  private constructor() {
    this.n8nBaseUrl = process.env.N8N_BASE_URL || 'http://n8n:5678';
    this.dataPath = process.env.DATA_PATH || '/app/data';
    this.status = {
      enabled: true,
      lastSync: null,
      errorCount: 0,
      totalSyncs: 0,
      skillCount: 0
    };
  }

  public static getInstance(): SkillSync {
    if (!SkillSync.instance) {
      SkillSync.instance = new SkillSync();
    }
    return SkillSync.instance;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🛠️  Initializing Skill Sync...');
      
      // Load existing skills
      await this.loadSkills();
      
      // Sync with n8n workflows
      await this.performSync();
      
      console.log('✅ Skill Sync initialized');
      
    } catch (error) {
      console.error('❌ Skill Sync initialization failed:', error);
      throw error;
    }
  }

  public async performSync(): Promise<{ synced: number; errors: number }> {
    if (!this.status.enabled) {
      return { synced: 0, errors: 0 };
    }

    try {
      console.log('🔄 Performing skill sync...');
      
      let syncedCount = 0;
      let errorCount = 0;

      // Get workflows from n8n
      const workflows = await this.getN8nWorkflows();
      
      // Load local skills
      const skills = await this.loadSkills();
      
      // Sync skills with workflows
      for (const skill of skills) {
        try {
          const matchingWorkflow = workflows.find(wf => 
            wf.name.includes(skill.name) || 
            wf.tags?.includes(skill.id) ||
            wf.id === skill.workflow_id
          );
          
          if (matchingWorkflow) {
            skill.workflow_id = matchingWorkflow.id;
            await this.updateSkill(skill);
            syncedCount++;
          } else if (skill.enabled) {
            // Create workflow for enabled skill
            const workflowId = await this.createSkillWorkflow(skill);
            if (workflowId) {
              skill.workflow_id = workflowId;
              await this.updateSkill(skill);
              syncedCount++;
            }
          }
        } catch (error) {
          console.error(`Error syncing skill ${skill.id}:`, error);
          errorCount++;
        }
      }

      // Update skills registry in Data Tables
      await this.syncSkillsRegistry(skills);
      
      this.status.lastSync = new Date().toISOString();
      this.status.totalSyncs++;
      this.status.errorCount += errorCount;
      this.status.skillCount = skills.length;

      console.log(`✅ Skill sync complete: ${syncedCount} synced, ${errorCount} errors`);
      
      return { synced: syncedCount, errors: errorCount };

    } catch (error) {
      console.error('❌ Skill sync failed:', error);
      this.status.errorCount++;
      throw error;
    }
  }

  public async registerSkill(skillData: Skill): Promise<boolean> {
    try {
      // Load existing skills
      const skills = await this.loadSkills();
      
      // Add or update skill
      const existingIndex = skills.findIndex(s => s.id === skillData.id);
      
      if (existingIndex >= 0) {
        skills[existingIndex] = { ...skills[existingIndex], ...skillData, updated_at: new Date().toISOString() };
      } else {
        skills.push({ ...skillData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      
      // Save skills
      await this.saveSkills(skills);
      
      // Create corresponding n8n workflow if enabled
      if (skillData.enabled && !skillData.workflow_id) {
        const workflowId = await this.createSkillWorkflow(skillData);
        if (workflowId) {
          skillData.workflow_id = workflowId;
          await this.updateSkill(skillData);
        }
      }
      
      // Sync to Data Tables
      await this.syncSkillsRegistry(skills);
      
      console.log(`✅ Skill registered: ${skillData.name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to register skill ${skillData.id}:`, error);
      return false;
    }
  }

  private async loadSkills(): Promise<Skill[]> {
    const skillsPath = join(this.dataPath, 'skills.json');
    
    if (!existsSync(skillsPath)) {
      return [];
    }
    
    try {
      const skillsData = JSON.parse(await readFile(skillsPath, 'utf-8'));
      return skillsData.skills || [];
    } catch (error) {
      console.error('Failed to load skills:', error);
      return [];
    }
  }

  private async saveSkills(skills: Skill[]): Promise<void> {
    const skillsPath = join(this.dataPath, 'skills.json');
    
    const skillsData = {
      skills,
      updated_at: new Date().toISOString()
    };
    
    await writeFile(skillsPath, JSON.stringify(skillsData, null, 2));
  }

  private async updateSkill(skill: Skill): Promise<void> {
    const skills = await this.loadSkills();
    const index = skills.findIndex(s => s.id === skill.id);
    
    if (index >= 0) {
      skills[index] = { ...skill, updated_at: new Date().toISOString() };
      await this.saveSkills(skills);
    }
  }

  private async getN8nWorkflows(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.n8nBaseUrl}/api/v1/workflows`, {
        timeout: 5000
      });
      
      return response.data.data || response.data || [];
    } catch (error) {
      console.warn('Failed to get n8n workflows:', error);
      return [];
    }
  }

  private async createSkillWorkflow(skill: Skill): Promise<string | null> {
    try {
      // Create a basic workflow template for the skill
      const workflowData = {
        name: `🛠️ ${skill.name} Skill`,
        active: skill.enabled,
        nodes: [
          {
            parameters: {
              path: `skill-${skill.id}`,
              httpMethod: 'POST',
              responseMode: 'responseNode'
            },
            id: `webhook-${Date.now()}`,
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [300, 300],
            webhookId: `skill-${skill.id}`
          },
          {
            parameters: {
              jsCode: `
// ${skill.name} Skill Implementation
// TODO: Implement skill logic here

const input = $input.all();
const parameters = input[0]?.json || {};

console.log('${skill.name} skill called with parameters:', parameters);

// Placeholder response
return {
  success: true,
  skill: '${skill.name}',
  result: 'Skill executed successfully',
  parameters,
  timestamp: new Date().toISOString()
};`
            },
            id: `code-${Date.now()}`,
            name: 'Skill Logic',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [500, 300]
          },
          {
            parameters: {},
            id: `response-${Date.now()}`,
            name: 'Response',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1,
            position: [700, 300]
          }
        ],
        connections: {
          'Webhook': {
            main: [
              [
                {
                  node: 'Skill Logic',
                  type: 'main',
                  index: 0
                }
              ]
            ]
          },
          'Skill Logic': {
            main: [
              [
                {
                  node: 'Response',
                  type: 'main',
                  index: 0
                }
              ]
            ]
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [skill.id, 'skill', 'transparentclaw'],
        settings: {
          saveManualExecutions: true,
          callerPolicy: 'workflowsFromSameOwner'
        }
      };

      const response = await axios.post(`${this.n8nBaseUrl}/api/v1/workflows`, workflowData, {
        timeout: 10000
      });

      console.log(`✅ Created workflow for skill: ${skill.name}`);
      return response.data.id;

    } catch (error) {
      console.error(`Failed to create workflow for skill ${skill.name}:`, error);
      return null;
    }
  }

  private async syncSkillsRegistry(skills: Skill[]): Promise<void> {
    try {
      // Save to local Data Tables format
      const tableDataPath = join(this.dataPath, 'tables-data', 'skills_registry.json');
      await writeFile(tableDataPath, JSON.stringify(skills, null, 2));
      
      // TODO: Sync to actual n8n Data Tables when API is available
      
    } catch (error) {
      console.error('Failed to sync skills registry:', error);
    }
  }

  public async enableSkill(skillId: string): Promise<boolean> {
    try {
      const skills = await this.loadSkills();
      const skill = skills.find(s => s.id === skillId);
      
      if (!skill) {
        throw new Error(`Skill not found: ${skillId}`);
      }
      
      skill.enabled = true;
      skill.updated_at = new Date().toISOString();
      
      await this.saveSkills(skills);
      
      // Activate corresponding workflow
      if (skill.workflow_id) {
        await this.setWorkflowActive(skill.workflow_id, true);
      } else {
        // Create workflow if it doesn't exist
        const workflowId = await this.createSkillWorkflow(skill);
        if (workflowId) {
          skill.workflow_id = workflowId;
          await this.updateSkill(skill);
        }
      }
      
      console.log(`✅ Skill enabled: ${skill.name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to enable skill ${skillId}:`, error);
      return false;
    }
  }

  public async disableSkill(skillId: string): Promise<boolean> {
    try {
      const skills = await this.loadSkills();
      const skill = skills.find(s => s.id === skillId);
      
      if (!skill) {
        throw new Error(`Skill not found: ${skillId}`);
      }
      
      skill.enabled = false;
      skill.updated_at = new Date().toISOString();
      
      await this.saveSkills(skills);
      
      // Deactivate corresponding workflow
      if (skill.workflow_id) {
        await this.setWorkflowActive(skill.workflow_id, false);
      }
      
      console.log(`🛑 Skill disabled: ${skill.name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to disable skill ${skillId}:`, error);
      return false;
    }
  }

  private async setWorkflowActive(workflowId: string, active: boolean): Promise<void> {
    try {
      await axios.patch(`${this.n8nBaseUrl}/api/v1/workflows/${workflowId}`, {
        active
      }, {
        timeout: 5000
      });
      
      console.log(`Workflow ${workflowId} ${active ? 'activated' : 'deactivated'}`);
      
    } catch (error) {
      console.error(`Failed to set workflow ${workflowId} active=${active}:`, error);
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public async disable(): Promise<void> {
    this.status.enabled = false;
    console.log('🛑 Skill sync disabled');
  }

  public async enable(): Promise<void> {
    this.status.enabled = true;
    console.log('✅ Skill sync enabled');
  }
}