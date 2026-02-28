<template>
  <div class="executions-view">
    <div class="executions-header">
      <h2>Execution History</h2>
      <p>View detailed logs and execution history from n8n workflows</p>
    </div>
    
    <div class="executions-container">
      <N8nEmbed path="/executions" title="n8n Execution History" />
    </div>
    
    <div v-if="!configStore.connected" class="executions-fallback">
      <div class="fallback-content">
        <h3>Execution History Unavailable</h3>
        <p>Connect to your n8n instance to view workflow execution history and logs.</p>
        <div class="fallback-actions">
          <RouterLink to="/settings" class="settings-link">
            Go to Settings
          </RouterLink>
          <button @click="openN8nDirect" class="open-direct-btn">
            Open n8n Directly
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import N8nEmbed from '@/components/N8nEmbed.vue'

const configStore = useConfigStore()

const openN8nDirect = () => {
  const url = configStore.n8nUrl || 'http://localhost:5678'
  window.open(`${url}/executions`, '_blank')
}
</script>

<style scoped>
.executions-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.executions-header {
  margin-bottom: 1.5rem;
}

.executions-header h2 {
  margin: 0 0 0.5rem 0;
  color: #c8d6e5;
  font-size: 1.5rem;
  font-weight: 600;
}

.executions-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

.executions-container {
  flex: 1;
  min-height: 0;
  background: #1a1f36;
  border-radius: 8px;
  border: 1px solid #2d3748;
  position: relative;
}

.executions-fallback {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 31, 54, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.fallback-content {
  text-align: center;
  padding: 2rem;
}

.fallback-content h3 {
  margin: 0 0 1rem 0;
  color: #c8d6e5;
  font-size: 1.25rem;
  font-weight: 600;
}

.fallback-content p {
  margin: 0 0 2rem 0;
  color: #9ca3af;
  font-size: 0.9rem;
  line-height: 1.5;
}

.fallback-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.settings-link,
.open-direct-btn {
  background: #4DD0E1;
  color: #1a1f36;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-block;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}

.open-direct-btn {
  background: transparent;
  color: #4DD0E1;
  border: 1px solid #4DD0E1;
}

.settings-link:hover,
.open-direct-btn:hover {
  transform: translateY(-1px);
}

.settings-link:hover {
  background: #26C6DA;
}

.open-direct-btn:hover {
  background: rgba(77, 208, 225, 0.1);
}
</style>