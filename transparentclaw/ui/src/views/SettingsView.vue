<template>
  <div class="settings-view">
    <div class="settings-header">
      <h2>Configuration</h2>
      <p>Manage your CrystalClaw and n8n connection settings</p>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <div class="section-header">
          <h3>n8n Connection</h3>
          <p>Configure your connection to the n8n instance</p>
        </div>
        
        <form @submit.prevent="saveConnection" class="connection-form">
          <div class="form-group">
            <label>n8n Instance URL</label>
            <input 
              v-model="connectionForm.n8nUrl" 
              type="url" 
              placeholder="https://your-n8n-instance.com"
              required
              :disabled="testing || saving"
            />
            <span class="field-help">The URL where your n8n instance is running</span>
          </div>
          
          <div class="form-group">
            <label>API Key</label>
            <div class="api-key-input">
              <input 
                v-model="connectionForm.apiKey" 
                :type="showApiKey ? 'text' : 'password'"
                placeholder="Your n8n API key"
                required
                :disabled="testing || saving"
              />
              <button 
                type="button" 
                @click="showApiKey = !showApiKey" 
                class="toggle-visibility-btn"
                :disabled="testing || saving"
              >
                {{ showApiKey ? '🙈' : '👁️' }}
              </button>
            </div>
            <span class="field-help">
              Generate an API key in n8n Settings → n8n API
            </span>
          </div>
          
          <div class="form-actions">
            <button 
              type="button" 
              @click="testConnection" 
              :disabled="!connectionForm.n8nUrl || !connectionForm.apiKey || testing || saving"
              class="test-btn"
            >
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </button>
            
            <button 
              type="submit" 
              :disabled="!connectionForm.n8nUrl || !connectionForm.apiKey || testing || saving"
              class="save-btn"
            >
              {{ saving ? 'Saving...' : 'Save & Connect' }}
            </button>
          </div>
        </form>
        
        <div v-if="connectionStatus" class="connection-status" :class="connectionStatus.type">
          <span class="status-icon">
            {{ connectionStatus.type === 'success' ? '✅' : connectionStatus.type === 'error' ? '❌' : 'ℹ️' }}
          </span>
          {{ connectionStatus.message }}
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <h3>Application Settings</h3>
          <p>Customize your CrystalClaw experience</p>
        </div>
        
        <div class="app-settings">
          <div class="setting-item">
            <div class="setting-info">
              <label>Auto-refresh Data</label>
              <span class="setting-description">Automatically refresh data from n8n periodically</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="appSettings.autoRefresh">
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <label>Dark Theme</label>
              <span class="setting-description">Use dark color scheme (always enabled for now)</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" :checked="true" disabled>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <label>Debug Mode</label>
              <span class="setting-description">Show additional debugging information</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="appSettings.debugMode">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <button @click="saveAppSettings" :disabled="saving" class="save-settings-btn">
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <h3>Quick Links</h3>
          <p>Direct access to n8n interfaces</p>
        </div>
        
        <div class="quick-links">
          <a :href="`${configStore.n8nUrl}/settings`" target="_blank" class="quick-link">
            <span class="link-icon">⚙️</span>
            <span class="link-text">n8n Settings</span>
            <span class="link-arrow">→</span>
          </a>
          
          <a :href="`${configStore.n8nUrl}/workflows`" target="_blank" class="quick-link">
            <span class="link-icon">🔄</span>
            <span class="link-text">n8n Workflows</span>
            <span class="link-arrow">→</span>
          </a>
          
          <a :href="`${configStore.n8nUrl}/executions`" target="_blank" class="quick-link">
            <span class="link-icon">📊</span>
            <span class="link-text">n8n Executions</span>
            <span class="link-arrow">→</span>
          </a>
          
          <a :href="`${configStore.n8nUrl}/chat`" target="_blank" class="quick-link">
            <span class="link-icon">💬</span>
            <span class="link-text">n8n Chat Hub</span>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </div>

      <div class="settings-section danger-zone">
        <div class="section-header">
          <h3>Danger Zone</h3>
          <p>Destructive actions that cannot be undone</p>
        </div>
        
        <div class="danger-actions">
          <button @click="clearAllData" class="danger-btn">
            Clear All Local Data
          </button>
          <button @click="resetToDefaults" class="danger-btn">
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

const connectionForm = reactive({
  n8nUrl: '',
  apiKey: ''
})

const appSettings = reactive({
  autoRefresh: false,
  debugMode: false
})

const showApiKey = ref(false)
const testing = ref(false)
const saving = ref(false)
const connectionStatus = ref<{type: 'success' | 'error' | 'info', message: string} | null>(null)

const loadSettings = () => {
  connectionForm.n8nUrl = configStore.n8nUrl
  connectionForm.apiKey = configStore.apiKey
  
  // Load app settings from localStorage
  appSettings.autoRefresh = localStorage.getItem('crystalclaw_auto_refresh') === 'true'
  appSettings.debugMode = localStorage.getItem('crystalclaw_debug_mode') === 'true'
}

const testConnection = async () => {
  testing.value = true
  connectionStatus.value = null
  
  try {
    // Temporarily set the config to test
    const originalUrl = configStore.n8nUrl
    const originalKey = configStore.apiKey
    
    configStore.setN8nUrl(connectionForm.n8nUrl)
    configStore.setApiKey(connectionForm.apiKey)
    
    const success = await configStore.testConnection()
    
    if (success) {
      connectionStatus.value = {
        type: 'success',
        message: 'Connection successful! n8n instance is reachable.'
      }
    } else {
      connectionStatus.value = {
        type: 'error',
        message: 'Connection failed. Please check your URL and API key.'
      }
      
      // Restore original values on failure
      configStore.setN8nUrl(originalUrl)
      configStore.setApiKey(originalKey)
    }
  } catch (error) {
    connectionStatus.value = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Connection test failed'
    }
  } finally {
    testing.value = false
  }
}

const saveConnection = async () => {
  saving.value = true
  connectionStatus.value = null
  
  try {
    configStore.setN8nUrl(connectionForm.n8nUrl)
    configStore.setApiKey(connectionForm.apiKey)
    
    const success = await configStore.connect()
    
    if (success) {
      connectionStatus.value = {
        type: 'success',
        message: 'Settings saved and connected successfully!'
      }
    } else {
      connectionStatus.value = {
        type: 'error',
        message: 'Settings saved but connection failed. Please verify your configuration.'
      }
    }
  } catch (error) {
    connectionStatus.value = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to save settings'
    }
  } finally {
    saving.value = false
  }
}

const saveAppSettings = () => {
  saving.value = true
  
  try {
    localStorage.setItem('crystalclaw_auto_refresh', appSettings.autoRefresh.toString())
    localStorage.setItem('crystalclaw_debug_mode', appSettings.debugMode.toString())
    
    connectionStatus.value = {
      type: 'success',
      message: 'Application settings saved!'
    }
  } catch (error) {
    connectionStatus.value = {
      type: 'error',
      message: 'Failed to save application settings'
    }
  } finally {
    saving.value = false
  }
}

const clearAllData = () => {
  if (confirm('This will clear all stored settings and data. Are you sure?')) {
    localStorage.clear()
    configStore.clearConfig()
    location.reload()
  }
}

const resetToDefaults = () => {
  if (confirm('This will reset all settings to their default values. Are you sure?')) {
    configStore.clearConfig()
    Object.assign(appSettings, { autoRefresh: false, debugMode: false })
    saveAppSettings()
    loadSettings()
    
    connectionStatus.value = {
      type: 'info',
      message: 'Settings reset to defaults'
    }
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-header h2 {
  margin: 0 0 0.5rem 0;
  color: #f5f5f5;
  font-size: 1.75rem;
  font-weight: 600;
}

.settings-header p {
  margin: 0;
  color: #ababab;
  font-size: 0.95rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: #262626;
  border: 1px solid #3d3d3d;
  border-radius: 12px;
  padding: 2rem;
}

.settings-section.danger-zone {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0 0 0.5rem 0;
  color: #f5f5f5;
  font-size: 1.25rem;
  font-weight: 600;
}

.section-header p {
  margin: 0;
  color: #ababab;
  font-size: 0.9rem;
}

.connection-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: #f5f5f5;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  background: #1a1a1a;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
  padding: 0.75rem;
  color: #f5f5f5;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #ff6d5a;
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.api-key-input {
  position: relative;
}

.toggle-visibility-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #ababab;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s;
}

.toggle-visibility-btn:hover:not(:disabled) {
  color: #f5f5f5;
}

.field-help {
  font-size: 0.8rem;
  color: #6b7280;
  font-style: italic;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.test-btn,
.save-btn {
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.9rem;
}

.test-btn {
  background: transparent;
  color: #ff6d5a;
  border: 1px solid #ff6d5a;
}

.save-btn {
  background: #ff6d5a;
  color: #262626;
}

.test-btn:hover:not(:disabled),
.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.test-btn:hover:not(:disabled) {
  background: rgba(77, 208, 225, 0.1);
}

.save-btn:hover:not(:disabled) {
  background: #e0604f;
}

.test-btn:disabled,
.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-status.success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

.connection-status.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.connection-status.info {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.app-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #1a1a1a;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  color: #f5f5f5;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.setting-description {
  color: #ababab;
  font-size: 0.8rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #3d3d3d;
  transition: 0.2s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #ff6d5a;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

input:disabled + .toggle-slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-settings-btn {
  background: #ff6d5a;
  color: #262626;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  align-self: flex-start;
}

.save-settings-btn:hover:not(:disabled) {
  background: #e0604f;
  transform: translateY(-1px);
}

.save-settings-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.quick-link {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #1a1a1a;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
  text-decoration: none;
  color: #f5f5f5;
  transition: all 0.2s;
  gap: 0.75rem;
}

.quick-link:hover {
  border-color: #ff6d5a;
  transform: translateY(-1px);
  background: rgba(77, 208, 225, 0.05);
}

.link-icon {
  font-size: 1.25rem;
}

.link-text {
  flex: 1;
  font-weight: 500;
}

.link-arrow {
  color: #ababab;
  transition: transform 0.2s;
}

.quick-link:hover .link-arrow {
  transform: translateX(2px);
  color: #ff6d5a;
}

.danger-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.danger-btn {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.danger-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
  }
  
  .quick-links {
    grid-template-columns: 1fr;
  }
  
  .danger-actions {
    flex-direction: column;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}
</style>