import { createRouter, createWebHistory } from 'vue-router'
import ChatView from './views/ChatView.vue'
import OverviewView from './views/OverviewView.vue'
import SoulView from './views/SoulView.vue'
import MemoryView from './views/MemoryView.vue'
import SkillsView from './views/SkillsView.vue'
import RoutinesView from './views/RoutinesView.vue'
import WorkflowsView from './views/WorkflowsView.vue'
import SettingsView from './views/SettingsView.vue'
import ExecutionsView from './views/ExecutionsView.vue'

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/chat', name: 'Chat', component: ChatView },
  { path: '/overview', name: 'Overview', component: OverviewView },
  { path: '/memory', name: 'Memory', component: MemoryView },
  { path: '/routines', name: 'Routines', component: RoutinesView },
  { path: '/soul', name: 'Soul', component: SoulView },
  { path: '/skills', name: 'Skills', component: SkillsView },
  { path: '/workflows', name: 'Workflows', component: WorkflowsView },
  { path: '/settings', name: 'Settings', component: SettingsView },
  { path: '/executions', name: 'Executions', component: ExecutionsView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router