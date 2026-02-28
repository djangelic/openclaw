<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">💎</span>
        <span v-if="!collapsed" class="logo-text">CrystalClaw</span>
      </div>
      <button class="collapse-btn" @click="toggleCollapse">
        <span>{{ collapsed ? '→' : '←' }}</span>
      </button>
    </div>

    <nav class="sidebar-nav">
      <!-- Chat Group -->
      <div class="nav-group">
        <div class="nav-group-header" @click="toggleGroup('chat')">
          <span class="group-icon">💬</span>
          <span v-if="!collapsed" class="group-label">Chat</span>
          <span v-if="!collapsed" class="expand-icon" :class="{ expanded: expandedGroups.chat }">▼</span>
        </div>
        <div v-if="!collapsed && expandedGroups.chat" class="nav-group-content">
          <RouterLink to="/chat" class="nav-item">
            <span class="nav-icon">💬</span>
            <span class="nav-label">Chat</span>
          </RouterLink>
        </div>
      </div>

      <!-- Control Group -->
      <div class="nav-group">
        <div class="nav-group-header" @click="toggleGroup('control')">
          <span class="group-icon">📊</span>
          <span v-if="!collapsed" class="group-label">Control</span>
          <span v-if="!collapsed" class="expand-icon" :class="{ expanded: expandedGroups.control }">▼</span>
        </div>
        <div v-if="!collapsed && expandedGroups.control" class="nav-group-content">
          <RouterLink to="/overview" class="nav-item">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">Overview</span>
          </RouterLink>
          <RouterLink to="/memory" class="nav-item">
            <span class="nav-icon">🧠</span>
            <span class="nav-label">Memory</span>
          </RouterLink>
          <RouterLink to="/routines" class="nav-item">
            <span class="nav-icon">⏰</span>
            <span class="nav-label">Routines</span>
          </RouterLink>
        </div>
      </div>

      <!-- Agent Group -->
      <div class="nav-group">
        <div class="nav-group-header" @click="toggleGroup('agent')">
          <span class="group-icon">🤖</span>
          <span v-if="!collapsed" class="group-label">Agent</span>
          <span v-if="!collapsed" class="expand-icon" :class="{ expanded: expandedGroups.agent }">▼</span>
        </div>
        <div v-if="!collapsed && expandedGroups.agent" class="nav-group-content">
          <RouterLink to="/soul" class="nav-item">
            <span class="nav-icon">👤</span>
            <span class="nav-label">Soul</span>
          </RouterLink>
          <RouterLink to="/skills" class="nav-item">
            <span class="nav-icon">🔧</span>
            <span class="nav-label">Skills</span>
          </RouterLink>
        </div>
      </div>

      <!-- Settings Group -->
      <div class="nav-group">
        <div class="nav-group-header" @click="toggleGroup('settings')">
          <span class="group-icon">⚙️</span>
          <span v-if="!collapsed" class="group-label">Settings</span>
          <span v-if="!collapsed" class="expand-icon" :class="{ expanded: expandedGroups.settings }">▼</span>
        </div>
        <div v-if="!collapsed && expandedGroups.settings" class="nav-group-content">
          <RouterLink to="/settings" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Config</span>
          </RouterLink>
          <RouterLink to="/workflows" class="nav-item">
            <span class="nav-icon">🔄</span>
            <span class="nav-label">Workflows</span>
          </RouterLink>
          <RouterLink to="/executions" class="nav-item">
            <span class="nav-icon">📋</span>
            <span class="nav-label">Executions</span>
          </RouterLink>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const collapsed = ref(false)
const expandedGroups = reactive({
  chat: true,
  control: true,
  agent: true,
  settings: false
})

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

const toggleGroup = (group: keyof typeof expandedGroups) => {
  if (!collapsed.value) {
    expandedGroups[group] = !expandedGroups[group]
  }
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: #1a1f36;
  border-right: 1px solid #2d3748;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #2d3748;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4DD0E1;
}

.collapse-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: #c8d6e5;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
}

.nav-group {
  margin-bottom: 0.5rem;
}

.nav-group-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: #9ca3af;
  font-weight: 500;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.nav-group-header:hover {
  color: #c8d6e5;
}

.group-icon {
  font-size: 1.1rem;
  margin-right: 0.5rem;
}

.group-label {
  flex: 1;
}

.expand-icon {
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.nav-group-content {
  border-left: 2px solid #374151;
  margin-left: 2rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.625rem 1rem;
  color: #c8d6e5;
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: rgba(77, 208, 225, 0.1);
  color: #4DD0E1;
}

.nav-item.router-link-active {
  background: rgba(77, 208, 225, 0.15);
  color: #4DD0E1;
  border-left: 3px solid #4DD0E1;
}

.nav-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
}

.nav-label {
  font-weight: 400;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.collapsed {
    width: 260px;
    transform: translateX(-100%);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }
}
</style>