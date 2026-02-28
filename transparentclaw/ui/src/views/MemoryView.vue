<template>
  <div class="memory-view">
    <div class="memory-header">
      <h2>Memory Browser</h2>
      <p>View and manage your agent's long-term and daily memory entries</p>
    </div>

    <div class="memory-controls">
      <div class="memory-tabs">
        <button 
          :class="{ active: activeTab === 'all' }" 
          @click="setActiveTab('all')"
          class="tab-btn"
        >
          All Memory
        </button>
        <button 
          :class="{ active: activeTab === 'long_term' }" 
          @click="setActiveTab('long_term')"
          class="tab-btn"
        >
          Long-term
        </button>
        <button 
          :class="{ active: activeTab === 'daily' }" 
          @click="setActiveTab('daily')"
          class="tab-btn"
        >
          Daily
        </button>
      </div>

      <div class="memory-actions">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search memory..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        <button @click="showAddModal = true" class="add-btn">
          <span class="btn-icon">➕</span>
          Add Memory
        </button>
        <button @click="refreshMemory" :disabled="loading" class="refresh-btn">
          <span class="btn-icon">🔄</span>
        </button>
      </div>
    </div>

    <div class="memory-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading memories...</p>
      </div>

      <div v-else-if="filteredMemories.length === 0" class="empty-state">
        <div class="empty-icon">🧠</div>
        <h3>No memories found</h3>
        <p>{{ searchQuery ? 'No memories match your search.' : 'No memories have been recorded yet.' }}</p>
        <button @click="showAddModal = true" class="empty-action-btn">
          Add First Memory
        </button>
      </div>

      <div v-else class="memory-list">
        <div 
          v-for="memory in filteredMemories" 
          :key="memory.id" 
          class="memory-item"
        >
          <div class="memory-header-item">
            <div class="memory-type" :class="`type-${memory.type}`">
              {{ memory.type === 'long_term' ? 'Long-term' : 'Daily' }}
            </div>
            <div class="memory-timestamp">{{ formatTimestamp(memory.timestamp) }}</div>
            <button @click="deleteMemory(memory)" class="delete-btn" title="Delete">
              🗑️
            </button>
          </div>
          <div class="memory-content-text">{{ memory.content }}</div>
        </div>
      </div>
    </div>

    <!-- Add Memory Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click="closeAddModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Add New Memory</h3>
          <button @click="closeAddModal" class="close-btn">✕</button>
        </div>
        <form @submit.prevent="addMemory" class="modal-content">
          <div class="form-group">
            <label>Memory Type</label>
            <select v-model="newMemory.type" required>
              <option value="daily">Daily Memory</option>
              <option value="long_term">Long-term Memory</option>
            </select>
          </div>
          <div class="form-group">
            <label>Content</label>
            <textarea 
              v-model="newMemory.content" 
              placeholder="Enter memory content..."
              rows="4"
              required
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeAddModal" class="cancel-btn">
              Cancel
            </button>
            <button type="submit" :disabled="!newMemory.content.trim()" class="save-btn">
              Save Memory
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useAgentStore } from '@/stores/agent'

const agentStore = useAgentStore()

const activeTab = ref<'all' | 'long_term' | 'daily'>('all')
const searchQuery = ref('')
const showAddModal = ref(false)
const loading = computed(() => agentStore.loading)

const newMemory = reactive({
  type: 'daily' as 'daily' | 'long_term',
  content: ''
})

const filteredMemories = computed(() => {
  let memories = agentStore.memoryEntries
  
  // Filter by tab
  if (activeTab.value !== 'all') {
    memories = memories.filter(m => m.type === activeTab.value)
  }
  
  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    memories = memories.filter(m => 
      m.content.toLowerCase().includes(query)
    )
  }
  
  // Sort by timestamp (newest first)
  return memories.slice().sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
})

const setActiveTab = (tab: 'all' | 'long_term' | 'daily') => {
  activeTab.value = tab
}

const refreshMemory = async () => {
  await agentStore.loadMemory()
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

const closeAddModal = () => {
  showAddModal.value = false
  newMemory.content = ''
  newMemory.type = 'daily'
}

const addMemory = async () => {
  // In a real implementation, this would call an API to add the memory
  // For now, we'll just show a placeholder message
  console.log('Adding memory:', newMemory)
  
  // Simulate adding to the store
  const memory = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    content: newMemory.content,
    type: newMemory.type
  }
  
  agentStore.memoryEntries.push(memory)
  closeAddModal()
}

const deleteMemory = async (memory: any) => {
  if (confirm('Are you sure you want to delete this memory?')) {
    // In a real implementation, this would call an API to delete the memory
    const index = agentStore.memoryEntries.findIndex(m => m.id === memory.id)
    if (index > -1) {
      agentStore.memoryEntries.splice(index, 1)
    }
  }
}

onMounted(() => {
  agentStore.loadMemory()
})
</script>

<style scoped>
.memory-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.memory-header {
  margin-bottom: 2rem;
}

.memory-header h2 {
  margin: 0 0 0.5rem 0;
  color: #c8d6e5;
  font-size: 1.75rem;
  font-weight: 600;
}

.memory-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.95rem;
}

.memory-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
}

.memory-tabs {
  display: flex;
  background: #1a1f36;
  border-radius: 8px;
  padding: 0.25rem;
  border: 1px solid #2d3748;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.625rem 1rem;
  border-radius: 6px;
  color: #9ca3af;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.tab-btn:hover {
  color: #c8d6e5;
}

.tab-btn.active {
  background: #4DD0E1;
  color: #1a1f36;
}

.memory-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-box {
  position: relative;
}

.search-input {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 8px;
  padding: 0.625rem 2.5rem 0.625rem 1rem;
  color: #c8d6e5;
  font-size: 0.875rem;
  width: 250px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4DD0E1;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.add-btn,
.refresh-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.refresh-btn {
  background: transparent;
  color: #4DD0E1;
  border: 1px solid #4DD0E1;
  padding: 0.625rem;
}

.add-btn:hover:not(:disabled),
.refresh-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(77, 208, 225, 0.1);
}

.add-btn:hover:not(:disabled) {
  background: #26C6DA;
}

.memory-content {
  flex: 1;
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #9ca3af;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: #c8d6e5;
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0 0 2rem 0;
  max-width: 300px;
}

.empty-action-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-action-btn:hover {
  background: #26C6DA;
  transform: translateY(-1px);
}

.memory-list {
  height: 100%;
  overflow-y: auto;
  padding-right: 1rem;
}

.memory-item {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: transform 0.2s;
}

.memory-item:hover {
  transform: translateY(-1px);
}

.memory-header-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.memory-type {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.memory-type.type-long_term {
  background: rgba(147, 51, 234, 0.2);
  color: #a855f7;
}

.memory-type.type-daily {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.memory-timestamp {
  color: #9ca3af;
  font-size: 0.8rem;
  flex: 1;
}

.delete-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: #ef4444;
}

.memory-content-text {
  color: #c8d6e5;
  line-height: 1.5;
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #2d3748;
}

.modal-header h3 {
  margin: 0;
  color: #c8d6e5;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #c8d6e5;
}

.modal-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #c8d6e5;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group select,
.form-group textarea {
  width: 100%;
  background: #0a0e1a;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 0.75rem;
  color: #c8d6e5;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  resize: vertical;
}

.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4DD0E1;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn {
  background: transparent;
  color: #9ca3af;
  border: 1px solid #374151;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: rgba(156, 163, 175, 0.1);
  color: #c8d6e5;
}

.save-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #26C6DA;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .memory-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .memory-actions {
    justify-content: space-between;
  }
  
  .search-input {
    width: 200px;
  }
}
</style>