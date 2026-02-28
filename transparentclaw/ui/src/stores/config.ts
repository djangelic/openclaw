import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const n8nUrl = ref(localStorage.getItem('n8n_url') || window.location.origin)
  const apiKey = ref(localStorage.getItem('n8n_api_key') || '')
  const connected = ref(false)
  const lastConnectionTest = ref<Date | null>(null)

  const isConfigured = computed(() => {
    return n8nUrl.value && apiKey.value
  })

  const setN8nUrl = (url: string) => {
    n8nUrl.value = url
    localStorage.setItem('n8n_url', url)
  }

  const setApiKey = (key: string) => {
    apiKey.value = key
    localStorage.setItem('n8n_api_key', key)
  }

  const clearConfig = () => {
    n8nUrl.value = ''
    apiKey.value = ''
    connected.value = false
    localStorage.removeItem('n8n_url')
    localStorage.removeItem('n8n_api_key')
  }

  const testConnection = async (): Promise<boolean> => {
    if (!isConfigured.value) return false
    
    try {
      const response = await fetch(`${n8nUrl.value}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': apiKey.value
        }
      })
      
      connected.value = response.ok
      lastConnectionTest.value = new Date()
      return connected.value
    } catch (error) {
      console.error('Connection test failed:', error)
      connected.value = false
      lastConnectionTest.value = new Date()
      return false
    }
  }

  const connect = async () => {
    const success = await testConnection()
    return success
  }

  const disconnect = () => {
    connected.value = false
  }

  return {
    n8nUrl,
    apiKey,
    connected,
    lastConnectionTest,
    isConfigured,
    setN8nUrl,
    setApiKey,
    clearConfig,
    testConnection,
    connect,
    disconnect
  }
})