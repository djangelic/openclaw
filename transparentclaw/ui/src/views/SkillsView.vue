<template>
  <div class="skills-view">
    <div class="skills-header">
      <h2>Skills Registry</h2>
      <p>Manage your agent's available skills and their associated n8n workflows</p>
    </div>

    <div class="skills-controls">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search skills..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      
      <div class="filter-controls">
        <select v-model="statusFilter" class="filter-select">
          <option value="all">All Skills</option>
          <option value="enabled">Enabled Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
        
        <button @click="refreshSkills" :disabled="loading" class="refresh-btn">
          <span class="btn-icon">🔄</span>
          Refresh
        </button>
      </div>
    </div>

    <div class="skills-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading skills...</p>
      </div>

      <div v-else-if="filteredSkills.length === 0" class="empty-state">
        <div class="empty-icon">🔧</div>
        <h3>No skills found</h3>
        <p>{{ searchQuery ? 'No skills match your search criteria.' : 'No skills have been registered yet.' }}</p>
      </div>

      <div v-else class="skills-grid">
        <div 
          v-for="skill in filteredSkills" 
          :key="skill.id" 
          class="skill-card"
          :class="{ disabled: !skill.enabled }"
        >
          <div class="skill-header">
            <div class="skill-title">
              <h3>{{ skill.name }}</h3>
              <div class="skill-status" :class="skill.enabled ? 'status-enabled' : 'status-disabled'">
                {{ skill.enabled ? 'Enabled' : 'Disabled' }}
              </div>
            </div>
            <div class="skill-actions">
              <button 
                @click="toggleSkill(skill)" 
                :class="skill.enabled ? 'disable-btn' : 'enable-btn'"
                class="toggle-btn"
              >
                {{ skill.enabled ? 'Disable' : 'Enable' }}
              </button>
            </div>
          </div>
          
          <div class="skill-description">
            <p>{{ skill.description || 'No description available' }}</p>
          </div>

          <div class="skill-details">
            <div class="detail-item" v-if="skill.workflow_id">
              <span class="detail-label">Workflow ID:</span>
              <span class="detail-value">{{ skill.workflow_id }}</span>
            </div>
            
            <div class="detail-item" v-if="skill.category">
              <span class="detail-label">Category:</span>
              <span class="detail-value">{{ skill.category }}</span>
            </div>
            
            <div class="detail-item" v-if="skill.version">
              <span class="detail-label">Version:</span>
              <span class="detail-value">{{ skill.version }}</span>
            </div>
          </div>

          <div class="skill-footer">
            <button 
              v-if="skill.workflow_id" 
              @click="openWorkflow(skill.workflow_id)" 
              class="workflow-btn"
            >
              <span class="btn-icon">🔄</span>
              Open in n8n
            </button>
            
            <button @click="viewSkillDetails(skill)" class="details-btn">
              <span class="btn-icon">📋</span>
              Details
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Skill Details Modal -->
    <div v-if="selectedSkill" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedSkill.name }}</h3>
          <button @click="closeDetailsModal" class="close-btn">✕</button>
        </div>
        <div class="modal-content">
          <div class="detail-section">
            <h4>Description</h4>
            <p>{{ selectedSkill.description || 'No description available' }}</p>
          </div>
          
          <div class="detail-section" v-if="selectedSkill.workflow_id">
            <h4>Workflow</h4>
            <p>ID: {{ selectedSkill.workflow_id }}</p>
            <button @click="openWorkflow(selectedSkill.workflow_id)" class="workflow-btn">
              Open in n8n
            </button>
          </div>
          
          <div class="detail-section">
            <h4>Configuration</h4>
            <div class="config-grid">
              <div class="config-item">
                <span class="config-label">Status:</span>
                <span class="config-value" :class="selectedSkill.enabled ? 'enabled' : 'disabled'">
                  {{ selectedSkill.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              
              <div class="config-item" v-if="selectedSkill.category">
                <span class="config-label">Category:</span>
                <span class="config-value">{{ selectedSkill.category }}</span>
              </div>
              
              <div class="config-item" v-if="selectedSkill.version">
                <span class="config-label">Version:</span>
                <span class="config-value">{{ selectedSkill.version }}</span>
              </div>
              
              <div class="config-item" v-if="selectedSkill.author">
                <span class="config-label">Author:</span>
                <span class="config-value">{{ selectedSkill.author }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="selectedSkill.parameters">
            <h4>Parameters</h4>
            <pre class="parameters-code">{{ JSON.stringify(selectedSkill.parameters, null, 2) }}</pre>
          </div>
        </div>
        <div class="modal-actions">
          <button 
            @click="toggleSkill(selectedSkill)" 
            :class="selectedSkill.enabled ? 'disable-btn' : 'enable-btn'"
            class="toggle-btn"
          >
            {{ selectedSkill.enabled ? 'Disable Skill' : 'Enable Skill' }}
          </button>
          <button @click="closeDetailsModal" class="close-modal-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAgentStore } from '@/stores/agent'
import { useConfigStore } from '@/stores/config'
import type { Skill } from '@/stores/agent'

const agentStore = useAgentStore()
const configStore = useConfigStore()

const searchQuery = ref('')
const statusFilter = ref('all')
const selectedSkill = ref<Skill | null>(null)
const loading = computed(() => agentStore.loading)

const filteredSkills = computed(() => {
  let skills = agentStore.skills
  
  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    skills = skills.filter(skill => 
      skill.name.toLowerCase().includes(query) ||
      (skill.description && skill.description.toLowerCase().includes(query))
    )
  }
  
  // Filter by status
  if (statusFilter.value === 'enabled') {
    skills = skills.filter(skill => skill.enabled)
  } else if (statusFilter.value === 'disabled') {
    skills = skills.filter(skill => !skill.enabled)
  }
  
  return skills
})

const refreshSkills = async () => {
  await agentStore.loadSkills()
}

const toggleSkill = async (skill: Skill) => {
  // In a real implementation, this would call an API to toggle the skill
  skill.enabled = !skill.enabled
  console.log(`${skill.enabled ? 'Enabled' : 'Disabled'} skill:`, skill.name)
}

const openWorkflow = (workflowId: string) => {
  const url = `${configStore.n8nUrl}/workflow/${workflowId}`
  window.open(url, '_blank')
}

const viewSkillDetails = (skill: Skill) => {
  selectedSkill.value = skill
}

const closeDetailsModal = () => {
  selectedSkill.value = null
}

onMounted(() => {
  agentStore.loadSkills()
})
</script>

<style scoped>
.skills-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skills-header {
  margin-bottom: 2rem;
}

.skills-header h2 {
  margin: 0 0 0.5rem 0;
  color: #f5f5f5;
  font-size: 1.75rem;
  font-weight: 600;
}

.skills-header p {
  margin: 0;
  color: #ababab;
  font-size: 0.95rem;
}

.skills-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
}

.search-box {
  position: relative;
}

.search-input {
  background: #262626;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
  padding: 0.625rem 2.5rem 0.625rem 1rem;
  color: #f5f5f5;
  font-size: 0.875rem;
  width: 300px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #ff6d5a;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #ababab;
  pointer-events: none;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-select {
  background: #262626;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
  padding: 0.625rem 1rem;
  color: #f5f5f5;
  font-size: 0.875rem;
  cursor: pointer;
}

.refresh-btn {
  background: transparent;
  color: #ff6d5a;
  border: 1px solid #ff6d5a;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(77, 208, 225, 0.1);
  transform: translateY(-1px);
}

.skills-content {
  flex: 1;
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #ababab;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #3d3d3d;
  border-top: 3px solid #ff6d5a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #ababab;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: #f5f5f5;
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0;
  max-width: 300px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  height: 100%;
  overflow-y: auto;
  padding-right: 1rem;
}

.skill-card {
  background: #262626;
  border: 1px solid #3d3d3d;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
  height: fit-content;
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.skill-card.disabled {
  opacity: 0.7;
  border-color: #3d3d3d;
}

.skill-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.skill-title h3 {
  margin: 0 0 0.5rem 0;
  color: #f5f5f5;
  font-size: 1.1rem;
  font-weight: 600;
}

.skill-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.skill-status.status-enabled {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.skill-status.status-disabled {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.skill-actions {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
  border: none;
}

.enable-btn {
  background: #10b981;
  color: white;
}

.disable-btn {
  background: #6b7280;
  color: white;
}

.toggle-btn:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.skill-description {
  margin-bottom: 1rem;
}

.skill-description p {
  margin: 0;
  color: #ababab;
  font-size: 0.9rem;
  line-height: 1.5;
}

.skill-details {
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  margin-bottom: 0.5rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
  min-width: 100px;
}

.detail-value {
  font-size: 0.8rem;
  color: #f5f5f5;
  font-family: monospace;
}

.skill-footer {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #3d3d3d;
}

.workflow-btn,
.details-btn {
  background: transparent;
  color: #ff6d5a;
  border: 1px solid #ff6d5a;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.workflow-btn:hover,
.details-btn:hover {
  background: rgba(77, 208, 225, 0.1);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 0.9rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #262626;
  border: 1px solid #3d3d3d;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #3d3d3d;
}

.modal-header h3 {
  margin: 0;
  color: #f5f5f5;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #ababab;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #f5f5f5;
}

.modal-content {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: #ff6d5a;
  font-size: 1rem;
  font-weight: 600;
}

.detail-section p {
  margin: 0;
  color: #ababab;
  line-height: 1.5;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.config-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.config-value {
  font-size: 0.9rem;
  color: #f5f5f5;
}

.config-value.enabled {
  color: #10b981;
}

.config-value.disabled {
  color: #6b7280;
}

.parameters-code {
  background: #1a1a1a;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
  padding: 1rem;
  color: #f5f5f5;
  font-size: 0.8rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #3d3d3d;
}

.close-modal-btn {
  background: transparent;
  color: #ababab;
  border: 1px solid #3d3d3d;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.close-modal-btn:hover {
  background: rgba(156, 163, 175, 0.1);
  color: #f5f5f5;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .skills-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .filter-controls {
    justify-content: space-between;
  }
  
  .search-input {
    width: 100%;
  }
  
  .skills-grid {
    grid-template-columns: 1fr;
  }
  
  .skill-footer {
    flex-direction: column;
  }
}
</style>