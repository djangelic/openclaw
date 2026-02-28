<template>
  <div class="routines-view">
    <div class="routines-header">
      <h2>Scheduled Routines</h2>
      <p>Monitor and manage scheduled workflows and heartbeat tasks</p>
    </div>

    <div class="routines-content">
      <div class="routines-tabs">
        <button 
          :class="{ active: activeTab === 'schedules' }" 
          @click="setActiveTab('schedules')"
          class="tab-btn"
        >
          <span class="tab-icon">⏰</span>
          Scheduled Workflows
        </button>
        <button 
          :class="{ active: activeTab === 'executions' }" 
          @click="setActiveTab('executions')"
          class="tab-btn"
        >
          <span class="tab-icon">📊</span>
          Recent Executions
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'schedules'" class="schedules-tab">
          <div class="section-header">
            <h3>Scheduled Workflows</h3>
            <div class="section-actions">
              <button @click="openN8nWorkflows" class="action-btn">
                <span class="btn-icon">🔄</span>
                Manage in n8n
              </button>
              <button @click="refreshData" :disabled="loading" class="action-btn secondary">
                <span class="btn-icon">🔄</span>
                Refresh
              </button>
            </div>
          </div>

          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading scheduled workflows...</p>
          </div>

          <div v-else-if="scheduledWorkflows.length === 0" class="empty-state">
            <div class="empty-icon">⏰</div>
            <h3>No scheduled workflows</h3>
            <p>No workflows with schedule triggers found. Create some in n8n to see them here.</p>
            <button @click="openN8nWorkflows" class="empty-action-btn">
              Create in n8n
            </button>
          </div>

          <div v-else class="workflows-list">
            <div 
              v-for="workflow in scheduledWorkflows" 
              :key="workflow.id" 
              class="workflow-item"
            >
              <div class="workflow-header">
                <div class="workflow-info">
                  <h4>{{ workflow.name }}</h4>
                  <div class="workflow-status" :class="workflow.active ? 'status-active' : 'status-inactive'">
                    {{ workflow.active ? 'Active' : 'Inactive' }}
                  </div>
                </div>
                <div class="workflow-actions">
                  <button @click="openWorkflow(workflow.id)" class="workflow-btn">
                    Open
                  </button>
                </div>
              </div>
              
              <div class="workflow-schedule" v-if="workflow.schedule">
                <span class="schedule-label">Schedule:</span>
                <span class="schedule-value">{{ workflow.schedule }}</span>
              </div>
              
              <div class="workflow-next-run" v-if="workflow.nextRun">
                <span class="next-run-label">Next run:</span>
                <span class="next-run-value">{{ formatDateTime(workflow.nextRun) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'executions'" class="executions-tab">
          <div class="section-header">
            <h3>Recent Executions</h3>
            <div class="section-actions">
              <button @click="openN8nExecutions" class="action-btn">
                <span class="btn-icon">📋</span>
                View All in n8n
              </button>
              <button @click="refreshData" :disabled="loading" class="action-btn secondary">
                <span class="btn-icon">🔄</span>
                Refresh
              </button>
            </div>
          </div>

          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading recent executions...</p>
          </div>

          <div v-else-if="recentExecutions.length === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <h3>No recent executions</h3>
            <p>No recent workflow executions found.</p>
          </div>

          <div v-else class="executions-list">
            <div 
              v-for="execution in recentExecutions" 
              :key="execution.id" 
              class="execution-item"
            >
              <div class="execution-header">
                <div class="execution-info">
                  <h4>{{ execution.workflowName }}</h4>
                  <div class="execution-status" :class="`status-${execution.status}`">
                    {{ execution.status }}
                  </div>
                </div>
                <div class="execution-time">
                  {{ formatDateTime(execution.startedAt) }}
                </div>
              </div>
              
              <div class="execution-details">
                <div class="execution-duration" v-if="execution.duration">
                  Duration: {{ execution.duration }}ms
                </div>
                <button @click="openExecution(execution.id)" class="execution-btn">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { getWorkflows, getExecutions } from '@/api/n8n'

const configStore = useConfigStore()

const activeTab = ref<'schedules' | 'executions'>('schedules')
const loading = ref(false)
const scheduledWorkflows = ref<any[]>([])
const recentExecutions = ref<any[]>([])

const setActiveTab = (tab: 'schedules' | 'executions') => {
  activeTab.value = tab
  if (tab === 'executions' && recentExecutions.value.length === 0) {
    loadExecutions()
  }
}

const loadWorkflows = async () => {
  try {
    const workflows = await getWorkflows()
    // Filter for workflows with schedule triggers (simplified logic)
    scheduledWorkflows.value = workflows
      .filter((w: any) => w.active && w.nodes?.some((n: any) => n.type?.includes('schedule') || n.type?.includes('cron')))
      .map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        schedule: extractSchedule(w),
        nextRun: calculateNextRun(w)
      }))
  } catch (error) {
    console.error('Failed to load workflows:', error)
    // Mock data for demo
    scheduledWorkflows.value = [
      {
        id: 'workflow_1',
        name: 'Daily Memory Cleanup',
        active: true,
        schedule: 'Every day at 2:00 AM',
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'workflow_2',
        name: 'Weekly Report Generation',
        active: true,
        schedule: 'Every Monday at 9:00 AM',
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
}

const loadExecutions = async () => {
  try {
    const executions = await getExecutions()
    recentExecutions.value = executions
      .slice(0, 10) // Limit to 10 most recent
      .map((e: any) => ({
        id: e.id,
        workflowName: e.workflowData?.name || 'Unknown Workflow',
        status: e.finished ? (e.mode === 'manual' ? 'success' : e.data?.resultData?.error ? 'error' : 'success') : 'running',
        startedAt: e.startedAt,
        duration: e.stoppedAt ? new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime() : null
      }))
  } catch (error) {
    console.error('Failed to load executions:', error)
    // Mock data for demo
    recentExecutions.value = [
      {
        id: 'exec_1',
        workflowName: 'Daily Memory Cleanup',
        status: 'success',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        duration: 1500
      },
      {
        id: 'exec_2',
        workflowName: 'Skill Registry Update',
        status: 'success',
        startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        duration: 850
      }
    ]
  }
}

const extractSchedule = (workflow: any): string => {
  // Simplified schedule extraction
  const scheduleNode = workflow.nodes?.find((n: any) => n.type?.includes('schedule') || n.type?.includes('cron'))
  if (scheduleNode?.parameters?.rule) {
    return scheduleNode.parameters.rule
  }
  return 'Custom schedule'
}

const calculateNextRun = (workflow: any): string => {
  // Simplified next run calculation
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const refreshData = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'schedules') {
      await loadWorkflows()
    } else {
      await loadExecutions()
    }
  } finally {
    loading.value = false
  }
}

const openN8nWorkflows = () => {
  window.open(`${configStore.n8nUrl}/workflows`, '_blank')
}

const openN8nExecutions = () => {
  window.open(`${configStore.n8nUrl}/executions`, '_blank')
}

const openWorkflow = (id: string) => {
  window.open(`${configStore.n8nUrl}/workflow/${id}`, '_blank')
}

const openExecution = (id: string) => {
  window.open(`${configStore.n8nUrl}/execution/${id}`, '_blank')
}

onMounted(() => {
  loadWorkflows()
})
</script>

<style scoped>
.routines-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.routines-header {
  margin-bottom: 2rem;
}

.routines-header h2 {
  margin: 0 0 0.5rem 0;
  color: #c8d6e5;
  font-size: 1.75rem;
  font-weight: 600;
}

.routines-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.95rem;
}

.routines-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.routines-tabs {
  display: flex;
  background: #1a1f36;
  border-radius: 8px;
  padding: 0.25rem;
  border: 1px solid #2d3748;
  margin-bottom: 2rem;
  width: fit-content;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  color: #9ca3af;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-btn:hover {
  color: #c8d6e5;
}

.tab-btn.active {
  background: #4DD0E1;
  color: #1a1f36;
}

.tab-icon {
  font-size: 1rem;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  color: #c8d6e5;
  font-size: 1.25rem;
  font-weight: 600;
}

.section-actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.625rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.action-btn.secondary {
  background: transparent;
  color: #4DD0E1;
  border: 1px solid #4DD0E1;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn.secondary:hover:not(:disabled) {
  background: rgba(77, 208, 225, 0.1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
}

.loading-spinner {
  width: 32px;
  height: 32px;
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
  height: 200px;
  color: #9ca3af;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
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
  line-height: 1.5;
}

.empty-action-btn {
  background: #4DD0E1;
  color: #1a1f36;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-action-btn:hover {
  background: #26C6DA;
  transform: translateY(-1px);
}

.workflows-list,
.executions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.workflow-item,
.execution-item {
  background: #1a1f36;
  border: 1px solid #2d3748;
  border-radius: 8px;
  padding: 1rem;
  transition: transform 0.2s;
}

.workflow-item:hover,
.execution-item:hover {
  transform: translateY(-1px);
}

.workflow-header,
.execution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.workflow-info h4,
.execution-info h4 {
  margin: 0 0 0.25rem 0;
  color: #c8d6e5;
  font-size: 1rem;
  font-weight: 600;
}

.workflow-status,
.execution-status {
  padding: 0.125rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-inactive {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.status-success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status-running {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.execution-time {
  color: #9ca3af;
  font-size: 0.8rem;
}

.workflow-schedule,
.workflow-next-run {
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.schedule-label,
.next-run-label {
  color: #9ca3af;
  margin-right: 0.5rem;
}

.schedule-value,
.next-run-value {
  color: #c8d6e5;
  font-weight: 500;
}

.execution-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.execution-duration {
  color: #9ca3af;
  font-size: 0.8rem;
}

.workflow-btn,
.execution-btn {
  background: transparent;
  color: #4DD0E1;
  border: 1px solid #4DD0E1;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
}

.workflow-btn:hover,
.execution-btn:hover {
  background: rgba(77, 208, 225, 0.1);
  transform: translateY(-1px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .section-actions {
    justify-content: space-between;
  }
  
  .routines-tabs {
    width: 100%;
  }
  
  .tab-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>