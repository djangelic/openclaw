import { useConfigStore } from '@/stores/config'
import type { SoulEntry, MemoryEntry, Skill } from '@/stores/agent'

class N8nApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'N8nApiError'
  }
}

const createHeaders = () => {
  const config = useConfigStore()
  return {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': config.apiKey
  }
}

const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
  const config = useConfigStore()
  const url = `${config.n8nUrl}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...createHeaders(),
      ...options.headers
    }
  })

  if (!response.ok) {
    throw new N8nApiError(`API request failed: ${response.statusText}`, response.status)
  }

  return response.json()
}

// Workflow Management
export const getWorkflows = async () => {
  return makeRequest('/api/v1/workflows')
}

export const getWorkflow = async (id: string) => {
  return makeRequest(`/api/v1/workflows/${id}`)
}

// Chat API
export const getChatConversations = async () => {
  try {
    return await makeRequest('/api/v1/chat/conversations')
  } catch (error) {
    console.warn('Chat API not available:', error)
    return []
  }
}

// Data Tables (these endpoints may vary based on n8n setup)
// We'll make reasonable attempts to access data table APIs
export const getDataTables = async () => {
  try {
    // Try common data table endpoints
    const endpoints = [
      '/api/v1/data-tables',
      '/api/v1/datatables', 
      '/api/v1/tables'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const result = await makeRequest(endpoint)
        return result
      } catch (e) {
        continue // Try next endpoint
      }
    }
    
    throw new Error('No data table API found')
  } catch (error) {
    console.warn('Data tables API not available:', error)
    return []
  }
}

// Soul Management (assumes soul data is in a data table)
export const getSoulEntries = async (): Promise<SoulEntry[]> => {
  try {
    // This would be a specific data table endpoint for soul entries
    // The exact endpoint depends on how data tables are configured in n8n
    const result = await makeRequest('/api/v1/data-tables/soul')
    return Array.isArray(result) ? result : [result]
  } catch (error) {
    console.warn('Soul data not available:', error)
    // Return mock data for now
    return [{
      id: '1',
      name: 'CrystalClaw Agent',
      emoji: '💎',
      personality: 'Helpful, intelligent, and focused on productivity',
      boundaries: 'Professional and ethical behavior at all times',
      voice: 'Clear, concise, and supportive'
    }]
  }
}

export const updateSoulEntry = async (key: string, value: any): Promise<void> => {
  try {
    await makeRequest('/api/v1/data-tables/soul', {
      method: 'PUT',
      body: JSON.stringify({ [key]: value })
    })
  } catch (error) {
    console.warn('Failed to update soul:', error)
    throw error
  }
}

// Memory Management
export const getMemoryEntries = async (type?: 'long_term' | 'daily'): Promise<MemoryEntry[]> => {
  try {
    const endpoint = type ? `/api/v1/data-tables/memory_${type}` : '/api/v1/data-tables/memory'
    const result = await makeRequest(endpoint)
    return Array.isArray(result) ? result : []
  } catch (error) {
    console.warn('Memory data not available:', error)
    // Return mock data
    return [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        content: 'System initialized and ready',
        type: type || 'daily'
      }
    ]
  }
}

// Skills Management
export const getSkills = async (): Promise<Skill[]> => {
  try {
    const result = await makeRequest('/api/v1/data-tables/skills_registry')
    return Array.isArray(result) ? result : []
  } catch (error) {
    console.warn('Skills registry not available:', error)
    // Return mock data
    return [
      {
        id: '1',
        name: 'Web Search',
        description: 'Search the internet for information',
        enabled: true,
        workflow_id: 'web_search_workflow'
      },
      {
        id: '2',
        name: 'Email Management',
        description: 'Send and manage emails',
        enabled: true,
        workflow_id: 'email_workflow'
      }
    ]
  }
}

// Execution monitoring
export const getExecutions = async () => {
  return makeRequest('/api/v1/executions')
}

export const getExecution = async (id: string) => {
  return makeRequest(`/api/v1/executions/${id}`)
}

export { N8nApiError }