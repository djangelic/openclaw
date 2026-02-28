<template>
  <div class="workflows-view">
    <div class="workflows-header">
      <h2>n8n Workflows</h2>
      <p>Access the full n8n workflow editor and management interface</p>
    </div>
    
    <div class="workflows-container">
      <N8nEmbed path="/workflows" title="n8n Workflow Editor" />
    </div>
    
    <div v-if="!configStore.connected" class="workflows-fallback">
      <div class="fallback-content">
        <h3>n8n Workflows Unavailable</h3>
        <p>Connect to your n8n instance to access the workflow editor.</p>
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
  window.open(`${url}/workflows`, '_blank')
}
</script>

<style scoped>
.workflows-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workflows-header {
  margin-bottom: 1.5rem;
}

.workflows-header h2 {
  margin: 0 0 0.5rem 0;
  color: #f5f5f5;
  font-size: 1.5rem;
  font-weight: 600;
}

.workflows-header p {
  margin: 0;
  color: #ababab;
  font-size: 0.9rem;
}

.workflows-container {
  flex: 1;
  min-height: 0;
  background: #262626;
  border-radius: 8px;
  border: 1px solid #3d3d3d;
  position: relative;
}

.workflows-fallback {
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
  color: #f5f5f5;
  font-size: 1.25rem;
  font-weight: 600;
}

.fallback-content p {
  margin: 0 0 2rem 0;
  color: #ababab;
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
  background: #ff6d5a;
  color: #262626;
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
  color: #ff6d5a;
  border: 1px solid #ff6d5a;
}

.settings-link:hover,
.open-direct-btn:hover {
  transform: translateY(-1px);
}

.settings-link:hover {
  background: #e0604f;
}

.open-direct-btn:hover {
  background: rgba(77, 208, 225, 0.1);
}
</style>