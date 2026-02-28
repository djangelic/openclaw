<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="agent-info">
        <div class="agent-avatar">{{ soul?.emoji || '💎' }}</div>
        <div class="agent-details">
          <h1 class="agent-name">{{ soul?.name || 'CrystalClaw Agent' }}</h1>
          <div class="agent-status">
            <div class="status-indicator" :class="statusClass"></div>
            <span class="status-text">{{ statusText }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="topbar-center">
      <div class="current-route">
        {{ currentRouteTitle }}
      </div>
    </div>

    <div class="topbar-right">
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-label">Memory</span>
          <span class="stat-value">{{ memoryCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Skills</span>
          <span class="stat-value">{{ skillsCount }}</span>
        </div>
      </div>
      
      <div class="action-buttons">
        <button @click="refreshData" :disabled="loading" class="action-btn" title="Refresh Data">
          <span class="action-icon">🔄</span>
        </button>
        <button @click="openN8n" class="action-btn" title="Open n8n">
          <span class="action-icon">🔗</span>
        </button>
      </div>

      <div class="connection-status" :class="connectionClass" :title="connectionTooltip">
        <div class="connection-dot"></div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useAgentStore } from '@/stores/agent'

const route = useRoute()
const configStore = useConfigStore()
const agentStore = useAgentStore()

const soul = computed(() => agentStore.soul)
const loading = computed(() => agentStore.loading)
const memoryCount = computed(() => agentStore.memoryEntries.length)
const skillsCount = computed(() => agentStore.skills.filter(s => s.enabled).length)

const currentRouteTitle = computed(() => {
  const routeNames: Record<string, string> = {
    'Chat': 'Chat Interface',
    'Overview': 'Agent Dashboard', 
    'Soul': 'Agent Identity',
    'Memory': 'Memory Browser',
    'Skills': 'Skills Registry',
    'Routines': 'Scheduled Tasks',
    'Workflows': 'n8n Workflows',
    'Settings': 'Configuration',
    'Executions': 'Execution History'
  }
  return routeNames[route.name as string] || 'CrystalClaw'
})

const statusText = computed(() => {
  if (!configStore.connected) return 'Disconnected'
  return 'Online'
})

const statusClass = computed(() => {
  if (!configStore.connected) return 'status-offline'
  return 'status-online'
})

const connectionClass = computed(() => {
  if (!configStore.connected) return 'connection-offline'
  return 'connection-online'
})

const connectionTooltip = computed(() => {
  if (!configStore.connected) {
    return `Disconnected from ${configStore.n8nUrl}`
  }
  return `Connected to ${configStore.n8nUrl}`
})

const refreshData = async () => {
  await agentStore.refreshAll()
}

const openN8n = () => {
  window.open(configStore.n8nUrl, '_blank')
}

onMounted(() => {
  agentStore.refreshAll()
})
</script>

<style scoped>
.topbar {
  height: 60px;
  background: #262626;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  position: relative;
}

.topbar-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.agent-avatar {
  font-size: 2rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 109, 90, 0.1);
  border-radius: 8px;
}

.agent-details {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-size: 1rem;
  font-weight: 600;
  color: #f5f5f5;
  margin: 0;
  line-height: 1.2;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.status-online {
  background: #6ad28a;
}

.status-indicator.status-offline {
  background: #ff6d5a;
}

.status-text {
  font-size: 0.75rem;
  color: #ababab;
  font-weight: 500;
}

.topbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.current-route {
  font-size: 0.9rem;
  color: #ababab;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
  justify-content: flex-end;
}

.quick-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.stat-label {
  font-size: 0.7rem;
  color: #7b7b7b;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 0.9rem;
  color: #ff6d5a;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: rgba(255, 109, 90, 0.1);
  border: 1px solid rgba(255, 109, 90, 0.3);
  color: #ff6d5a;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 109, 90, 0.2);
  border-color: rgba(255, 109, 90, 0.5);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 0.85rem;
}

.connection-status {
  display: flex;
  align-items: center;
}

.connection-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.connection-online .connection-dot {
  background: #6ad28a;
  box-shadow: 0 0 8px rgba(106, 210, 138, 0.4);
}

.connection-offline .connection-dot {
  background: #ff6d5a;
  box-shadow: 0 0 8px rgba(255, 109, 90, 0.4);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@media (max-width: 768px) {
  .topbar {
    padding: 0 1rem;
  }
  
  .quick-stats {
    display: none;
  }
  
  .current-route {
    display: none;
  }
}
</style>