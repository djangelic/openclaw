<template>
  <div class="n8n-embed">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading n8n interface...</p>
    </div>
    
    <div v-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Unable to load n8n interface</h3>
      <p>{{ error }}</p>
      <div class="error-actions">
        <button @click="retry" class="retry-btn">Try Again</button>
        <a :href="fullUrl" target="_blank" class="open-link">Open in New Tab</a>
      </div>
    </div>
    
    <iframe 
      v-show="!loading && !error"
      ref="iframeRef"
      :src="fullUrl"
      @load="onLoad"
      @error="onError"
      class="n8n-iframe"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      allowfullscreen
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'

interface Props {
  path: string
  title?: string
}

const props = defineProps<Props>()

const configStore = useConfigStore()
const iframeRef = ref<HTMLIFrameElement>()
const loading = ref(true)
const error = ref('')

const fullUrl = computed(() => {
  let url = configStore.n8nUrl
  if (!url.endsWith('/')) {
    url += '/'
  }
  if (props.path.startsWith('/')) {
    return url + props.path.slice(1)
  }
  return url + props.path
})

const onLoad = () => {
  loading.value = false
  error.value = ''
}

const onError = () => {
  loading.value = false
  error.value = 'Failed to load the n8n interface. This might be due to CORS restrictions or connection issues.'
}

const retry = () => {
  loading.value = true
  error.value = ''
  if (iframeRef.value) {
    iframeRef.value.src = fullUrl.value
  }
}

onMounted(() => {
  // Set a timeout to handle cases where load event doesn't fire
  setTimeout(() => {
    if (loading.value) {
      onError()
    }
  }, 10000)
})
</script>

<style scoped>
.n8n-embed {
  height: 100%;
  width: 100%;
  position: relative;
  background: #0a0e1a;
  border-radius: 8px;
  overflow: hidden;
}

.n8n-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #374151;
  border-top: 3px solid #4DD0E1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-state p {
  margin: 0;
  font-size: 0.9rem;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h3 {
  margin: 0 0 1rem 0;
  color: #c8d6e5;
  font-size: 1.25rem;
  font-weight: 600;
}

.error-state p {
  margin: 0 0 2rem 0;
  max-width: 400px;
  line-height: 1.5;
  font-size: 0.9rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.retry-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.retry-btn:hover {
  background: #26C6DA;
  transform: translateY(-1px);
}

.open-link {
  background: transparent;
  color: #4DD0E1;
  border: 1px solid #4DD0E1;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.open-link:hover {
  background: rgba(77, 208, 225, 0.1);
  transform: translateY(-1px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>