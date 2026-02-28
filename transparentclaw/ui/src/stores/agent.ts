import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSoulEntries, getMemoryEntries, getSkills, updateSoulEntry } from '@/api/n8n'

export interface SoulEntry {
  id: string
  name: string
  emoji: string
  personality: string
  boundaries: string
  voice: string
  [key: string]: any
}

export interface MemoryEntry {
  id: string
  timestamp: string
  content: string
  type: 'long_term' | 'daily'
  [key: string]: any
}

export interface Skill {
  id: string
  name: string
  description: string
  enabled: boolean
  workflow_id?: string
  [key: string]: any
}

export const useAgentStore = defineStore('agent', () => {
  const soul = ref<SoulEntry | null>(null)
  const memoryEntries = ref<MemoryEntry[]>([])
  const skills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadSoul = async () => {
    loading.value = true
    error.value = null
    try {
      const entries = await getSoulEntries()
      if (entries && entries.length > 0) {
        soul.value = entries[0]
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load soul data'
      console.error('Failed to load soul:', err)
    } finally {
      loading.value = false
    }
  }

  const loadMemory = async (type?: 'long_term' | 'daily') => {
    loading.value = true
    error.value = null
    try {
      const entries = await getMemoryEntries(type)
      memoryEntries.value = entries
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load memory'
      console.error('Failed to load memory:', err)
    } finally {
      loading.value = false
    }
  }

  const loadSkills = async () => {
    loading.value = true
    error.value = null
    try {
      const skillList = await getSkills()
      skills.value = skillList
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load skills'
      console.error('Failed to load skills:', err)
    } finally {
      loading.value = false
    }
  }

  const updateSoul = async (key: string, value: any) => {
    if (!soul.value) return false
    
    loading.value = true
    error.value = null
    try {
      await updateSoulEntry(key, value)
      soul.value[key] = value
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update soul'
      console.error('Failed to update soul:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  const refreshAll = async () => {
    await Promise.all([
      loadSoul(),
      loadMemory(),
      loadSkills()
    ])
  }

  return {
    soul,
    memoryEntries,
    skills,
    loading,
    error,
    loadSoul,
    loadMemory,
    loadSkills,
    updateSoul,
    refreshAll
  }
})