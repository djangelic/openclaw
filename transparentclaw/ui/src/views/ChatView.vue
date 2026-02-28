<template>
  <div class="chat-view">
    <div class="chat-frame-container">
      <iframe 
        :src="chatUrl" 
        class="chat-frame"
        allow="clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

const chatUrl = computed(() => {
  const base = configStore.n8nUrl || window.location.origin
  return `${base}/n8n/chat`
})
</script>

<style scoped>
.chat-view {
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

.chat-frame-container {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #3d3d3d;
}

.chat-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #262626;
}
</style>
