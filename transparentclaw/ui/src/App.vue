<template>
  <div class="app">
    <div v-if="!configStore.isConfigured" class="setup-screen">
      <div class="setup-card">
        <h1>Welcome to CrystalClaw 💎</h1>
        <p>Connect to your n8n instance to get started</p>
        
        <form @submit.prevent="setupConnection" class="setup-form">
          <div class="form-group">
            <label>n8n Instance URL</label>
            <input 
              v-model="setupUrl" 
              type="url" 
              placeholder="https://your-n8n-instance.com"
              required
            />
          </div>
          
          <div class="form-group">
            <label>API Key</label>
            <input 
              v-model="setupApiKey" 
              type="password" 
              placeholder="Your n8n API key"
              required
            />
          </div>
          
          <button type="submit" :disabled="testing" class="connect-btn">
            {{ testing ? 'Testing...' : 'Connect & Save' }}
          </button>
        </form>
        
        <div v-if="setupError" class="error">
          {{ setupError }}
        </div>
      </div>
    </div>
    
    <div v-else class="main-layout">
      <Sidebar />
      <div class="content-area">
        <TopBar />
        <main class="main-content">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import Sidebar from '@/components/Sidebar.vue'
import TopBar from '@/components/TopBar.vue'

const configStore = useConfigStore()
const setupUrl = ref('')
const setupApiKey = ref('')
const testing = ref(false)
const setupError = ref('')

const setupConnection = async () => {
  testing.value = true
  setupError.value = ''
  
  try {
    configStore.setN8nUrl(setupUrl.value)
    configStore.setApiKey(setupApiKey.value)
    
    const success = await configStore.connect()
    if (!success) {
      setupError.value = 'Failed to connect. Please check your URL and API key.'
    }
  } catch (error) {
    setupError.value = error instanceof Error ? error.message : 'Connection failed'
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  setupUrl.value = configStore.n8nUrl
})
</script>

<style scoped>
.app {
  height: 100vh;
  width: 100vw;
  background-color: #1a1a1a;
  color: #f5f5f5;
  overflow: hidden;
}

.setup-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #262626 100%);
}

.setup-card {
  background: #262626;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid #3d3d3d;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.setup-card h1 {
  margin: 0 0 1rem 0;
  color: #ff6d5a;
  font-size: 2rem;
  font-weight: 300;
}

.setup-card p {
  margin: 0 0 2rem 0;
  color: #ababab;
  font-size: 0.95rem;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #f5f5f5;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  color: #f5f5f5;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #ff6d5a;
}

.connect-btn {
  background: #ff6d5a;
  color: #262626;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn:hover:not(:disabled) {
  background: #e0604f;
  transform: translateY(-1px);
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 109, 90, 0.1);
  border: 1px solid rgba(255, 109, 90, 0.3);
  border-radius: 6px;
  color: #ff6d5a;
  font-size: 0.85rem;
}

.main-layout {
  display: flex;
  height: 100vh;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}
</style>