<template>
  <div class="overview-view">
    <div class="overview-header">
      <h2>Agent Overview</h2>
      <p>Dashboard for monitoring agent status and activity</p>
    </div>

    <div class="overview-grid">
      <!-- Agent Identity Card -->
      <div class="overview-card agent-identity">
        <div class="card-header">
          <div class="card-icon">{{ soul?.emoji || '💎' }}</div>
          <div class="card-title">Agent Identity</div>
        </div>
        <div class="card-content">
          <div class="agent-name">{{ soul?.name || 'CrystalClaw Agent' }}</div>
          <div class="agent-personality">{{ soul?.personality || 'Intelligent assistant ready to help' }}</div>
          <div class="uptime">
            <span class="uptime-label">Status:</span>
            <span class="uptime-value" :class="statusClass">{{ statusText }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="overview-card stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ memoryCount }}</div>
          <div class="stat-label">Memory Entries</div>
          <RouterLink to="/memory" class="stat-link">View →</RouterLink>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ enabledSkillsCount }}</div>
          <div class="stat-label">Active Skills</div>
          <RouterLink to="/skills" class="stat-link">Manage →</RouterLink>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ totalSkillsCount }}</div>
          <div class="stat-label">Total Skills</div>
          <RouterLink to="/skills" class="stat-link">View →</RouterLink>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="overview-card recent-activity">
        <div class="card-header">
          <div class="card-icon">📝</div>
          <div class="card-title">Recent Activity</div>
        </div>
        <div class="card-content">
          <div v-if="recentMemories.length === 0" class="empty-state">
            <p>No recent activity to display</p>
          </div>
          <div v-else class="activity-list">
            <div v-for="memory in recentMemories" :key="memory.id" class="activity-item">
              <div class="activity-time">{{ formatTime(memory.timestamp) }}</div>
              <div class="activity-content">{{ memory.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Status -->
      <div class="overview-card system-status">
        <div class="card-header">
          <div class="card-icon">⚡</div>
          <div class="card-title">System Status</div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="status-label">n8n Connection:</span>
            <span class="status-value" :class="connectionClass">{{ connectionText }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Data Sync:</span>
            <span class="status-value status-online">Active</span>
          </div>
          <div class="status-item">
            <span class="status-label">Last Update:</span>
            <span class="status-value">{{ lastUpdateText }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button @click="refreshData" :disabled="loading" class="action-btn">
        <span class="btn-icon">🔄</span>
        {{ loading ? 'Refreshing...' : 'Refresh Data' }}
      </button>
      <RouterLink to="/chat" class="action-btn">
        <span class="btn-icon">💬</span>
        Start Chat
      </RouterLink>
      <button @click="openN8n" class="action-btn secondary">
        <span class="btn-icon">🔗</span>
        Open n8n
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useAgentStore } from '@/stores/agent'

const configStore = useConfigStore()
const agentStore = useAgentStore()

const soul = computed(() => agentStore.soul)
const loading = computed(() => agentStore.loading)
const memoryCount = computed(() => agentStore.memoryEntries.length)
const enabledSkillsCount = computed(() => agentStore.skills.filter(s => s.enabled).length)
const totalSkillsCount = computed(() => agentStore.skills.length)

const recentMemories = computed(() => {
  return agentStore.memoryEntries
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
})

const statusText = computed(() => {
  return configStore.connected ? 'Online' : 'Offline'
})

const statusClass = computed(() => {
  return configStore.connected ? 'status-online' : 'status-offline'
})

const connectionText = computed(() => {
  return configStore.connected ? 'Connected' : 'Disconnected'
})

const connectionClass = computed(() => {
  return configStore.connected ? 'status-online' : 'status-offline'
})

const lastUpdateText = computed(() => {
  if (configStore.lastConnectionTest) {
    return formatTime(configStore.lastConnectionTest.toISOString())
  }
  return 'Never'
})

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now'
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

const refreshData = async () => {
  await agentStore.refreshAll()
  await configStore.testConnection()
}

const openN8n = () => {
  window.open(configStore.n8nUrl, '_blank')
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.overview-view {
  height: 100%;
  overflow-y: auto;
}

.overview-header {
  margin-bottom: 2rem;
}

.overview-header h2 {
  margin: 0 0 0.5rem 0;
  color: #c8d6e5;
  font-size: 1.75rem;
  font-weight: 600;
}

.overview-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.95rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.overview-card {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.card-icon {
  font-size: 1.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #c8d6e5;
}

.card-content {
  color: #9ca3af;
}

.agent-identity .agent-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #c8d6e5;
  margin-bottom: 0.5rem;
}

.agent-identity .agent-personality {
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.uptime {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.uptime-label {
  color: #9ca3af;
}

.uptime-value {
  font-weight: 500;
}

.status-online {
  color: #10b981;
}

.status-offline {
  color: #ef4444;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  background: rgba(77, 208, 225, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(77, 208, 225, 0.1);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #4DD0E1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.stat-link {
  font-size: 0.75rem;
  color: #4DD0E1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.stat-link:hover {
  color: #26C6DA;
}

.recent-activity {
  grid-column: span 2;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-style: italic;
}

.activity-list {
  max-height: 200px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #374151;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-time {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  min-width: 80px;
}

.activity-content {
  flex: 1;
  font-size: 0.85rem;
  line-height: 1.4;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-size: 0.85rem;
  color: #9ca3af;
}

.status-value {
  font-size: 0.85rem;
  font-weight: 500;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.action-btn:hover:not(:disabled) {
  background: #26C6DA;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.secondary {
  background: transparent;
  color: #4DD0E1;
  border: 1px solid #4DD0E1;
}

.action-btn.secondary:hover:not(:disabled) {
  background: rgba(77, 208, 225, 0.1);
}

.btn-icon {
  font-size: 1rem;
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .recent-activity {
    grid-column: span 1;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>