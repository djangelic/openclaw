<template>
  <div class="soul-view">
    <div class="soul-header">
      <h2>Agent Soul</h2>
      <p>Configure your agent's identity, personality, and behavior</p>
    </div>

    <div class="soul-container">
      <div class="soul-form">
        <div class="form-section">
          <h3>Basic Identity</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Agent Name</label>
              <input 
                v-model="formData.name" 
                type="text" 
                placeholder="Enter agent name"
                :disabled="saving"
              />
            </div>
            <div class="form-group emoji-group">
              <label>Avatar Emoji</label>
              <input 
                v-model="formData.emoji" 
                type="text" 
                placeholder="💎"
                maxlength="2"
                :disabled="saving"
                class="emoji-input"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Personality</h3>
          <div class="form-group">
            <label>Personality Description</label>
            <textarea 
              v-model="formData.personality" 
              placeholder="Describe your agent's personality, tone, and communication style..."
              rows="4"
              :disabled="saving"
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>Boundaries & Ethics</h3>
          <div class="form-group">
            <label>Behavioral Boundaries</label>
            <textarea 
              v-model="formData.boundaries" 
              placeholder="Define what your agent should and shouldn't do, ethical guidelines..."
              rows="4"
              :disabled="saving"
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>Voice & Communication</h3>
          <div class="form-group">
            <label>Voice Style</label>
            <textarea 
              v-model="formData.voice" 
              placeholder="Describe how your agent should communicate (formal, casual, technical, friendly, etc.)"
              rows="3"
              :disabled="saving"
            ></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button @click="resetForm" :disabled="saving" class="reset-btn">
            Reset
          </button>
          <button @click="saveChanges" :disabled="saving || !hasChanges" class="save-btn">
            <span v-if="saving">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </div>

      <div class="soul-preview">
        <div class="preview-card">
          <h3>Preview</h3>
          <div class="preview-content">
            <div class="preview-identity">
              <div class="preview-avatar">{{ formData.emoji || '💎' }}</div>
              <div class="preview-name">{{ formData.name || 'Unnamed Agent' }}</div>
            </div>
            
            <div class="preview-section" v-if="formData.personality">
              <h4>Personality</h4>
              <p>{{ formData.personality }}</p>
            </div>
            
            <div class="preview-section" v-if="formData.voice">
              <h4>Communication Style</h4>
              <p>{{ formData.voice }}</p>
            </div>
            
            <div class="preview-section" v-if="formData.boundaries">
              <h4>Guidelines</h4>
              <p>{{ formData.boundaries }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <span class="error-icon">⚠️</span>
      {{ error }}
    </div>

    <div v-if="successMessage" class="success-message">
      <span class="success-icon">✅</span>
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAgentStore } from '@/stores/agent'

const agentStore = useAgentStore()

const formData = reactive({
  name: '',
  emoji: '',
  personality: '',
  boundaries: '',
  voice: ''
})

const originalData = ref({
  name: '',
  emoji: '',
  personality: '',
  boundaries: '',
  voice: ''
})

const saving = ref(false)
const error = ref('')
const successMessage = ref('')

const hasChanges = computed(() => {
  return Object.keys(formData).some(key => {
    return formData[key as keyof typeof formData] !== originalData.value[key as keyof typeof originalData.value]
  })
})

const loadSoulData = () => {
  const soul = agentStore.soul
  if (soul) {
    formData.name = soul.name || ''
    formData.emoji = soul.emoji || ''
    formData.personality = soul.personality || ''
    formData.boundaries = soul.boundaries || ''
    formData.voice = soul.voice || ''
    
    // Store original data
    originalData.value = { ...formData }
  }
}

const resetForm = () => {
  Object.assign(formData, originalData.value)
  error.value = ''
  successMessage.value = ''
}

const saveChanges = async () => {
  if (!hasChanges.value) return
  
  saving.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    // Save each field that has changed
    for (const [key, value] of Object.entries(formData)) {
      if (value !== originalData.value[key as keyof typeof originalData.value]) {
        await agentStore.updateSoul(key, value)
      }
    }
    
    // Update original data
    originalData.value = { ...formData }
    successMessage.value = 'Soul configuration saved successfully!'
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save soul configuration'
  } finally {
    saving.value = false
  }
}

// Watch for changes in the agent store
watch(() => agentStore.soul, () => {
  loadSoulData()
}, { immediate: true })

onMounted(async () => {
  await agentStore.loadSoul()
})
</script>

<style scoped>
.soul-view {
  height: 100%;
  overflow-y: auto;
}

.soul-header {
  margin-bottom: 2rem;
}

.soul-header h2 {
  margin: 0 0 0.5rem 0;
  color: #c8d6e5;
  font-size: 1.75rem;
  font-weight: 600;
}

.soul-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.95rem;
}

.soul-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  margin-bottom: 2rem;
}

.soul-form {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 12px;
  padding: 2rem;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section h3 {
  margin: 0 0 1rem 0;
  color: #c8d6e5;
  font-size: 1.1rem;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: #c8d6e5;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  background: #0a0e1a;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 0.75rem;
  color: #c8d6e5;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4DD0E1;
}

.form-group input:disabled,
.form-group textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.emoji-input {
  text-align: center;
  font-size: 1.5rem !important;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #2d3748;
}

.reset-btn {
  background: transparent;
  color: #9ca3af;
  border: 1px solid #374151;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover:not(:disabled) {
  background: rgba(156, 163, 175, 0.1);
  color: #c8d6e5;
}

.save-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
}

.save-btn:hover:not(:disabled) {
  background: #26C6DA;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.soul-preview {
  position: sticky;
  top: 1rem;
}

.preview-card {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 12px;
  padding: 1.5rem;
}

.preview-card h3 {
  margin: 0 0 1rem 0;
  color: #c8d6e5;
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-identity {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(77, 208, 225, 0.05);
  border-radius: 8px;
}

.preview-avatar {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(77, 208, 225, 0.1);
  border-radius: 12px;
}

.preview-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #c8d6e5;
}

.preview-section {
  margin-bottom: 1.5rem;
}

.preview-section:last-child {
  margin-bottom: 0;
}

.preview-section h4 {
  margin: 0 0 0.5rem 0;
  color: #4DD0E1;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-section p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.85rem;
  line-height: 1.5;
}

.error-message,
.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.success-message {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

@media (max-width: 768px) {
  .soul-container {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>