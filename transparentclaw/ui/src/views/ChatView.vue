<template>
  <div class="chat-view">
    <div class="chat-header">
      <h2>Chat Interface</h2>
      <p>Conversational interface powered by n8n Chat Hub</p>
    </div>
    
    <div class="chat-container">
      <N8nEmbed path="/chat" title="n8n Chat Hub" />
    </div>
    
    <div v-if="!configStore.connected" class="chat-fallback">
      <div class="fallback-content">
        <h3>Chat Interface Unavailable</h3>
        <p>Connect to your n8n instance to access the chat interface.</p>
        <RouterLink to="/settings" class="settings-link">
          Go to Settings
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import N8nEmbed from '@/components/N8nEmbed.vue'

const configStore = useConfigStore()
</script>

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  margin-bottom: 1.5rem;
}

.chat-header h2 {
  margin: 0 0 0.5rem 0;
  color: #c8d6e5;
  font-size: 1.5rem;
  font-weight: 600;
}

.chat-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

.chat-container {
  flex: 1;
  min-height: 0;
  background: #1a1f36;
  border-radius: 8px;
  border: 1px solid #2d3748;
}

.chat-fallback {
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

.settings-link {
  background: #4DD0E1;
  color: #1a1f36;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-block;
}

.settings-link:hover {
  background: #26C6DA;
  transform: translateY(-1px);
}
</style>