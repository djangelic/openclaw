# CrystalClaw UI Modification Plan

*Forking n8n's editor-ui and adding OpenClaw agent features*

## Overview

We're forking n8n's `packages/frontend/editor-ui` to create CrystalClaw - a hybrid AI agent interface that combines n8n's workflow editor with OpenClaw's agent capabilities. The goal is to add persistent Chat Hub and agent management features to n8n's existing interface.

## Current n8n Architecture Analysis

### Layout System
- **BaseLayout.vue** (`src/app/layouts/BaseLayout.vue`) - Main CSS Grid layout container
- **AppLayout.vue** (`src/app/components/app/AppLayout.vue`) - Route-based layout switcher
- **Layout Types**: DefaultLayout, SettingsLayout, WorkflowLayout, AuthLayout, DemoLayout, ChatLayout

### Current Chat Implementation 
- **AppChatPanel.vue** (`src/app/components/app/AppChatPanel.vue`) - Renders AssistantsHub in 'aside' slot
- **AssistantsHub.vue** (`src/features/ai/assistant/components/AssistantsHub.vue`) - Main assistant interface
- **ChatLayout.vue** (`src/app/layouts/ChatLayout.vue`) - Dedicated chat route layout with ChatSidebar

### CSS Grid Structure (BaseLayout)
```css
grid-template-areas:
  'banners banners banners'
  'sidebar header aside'
  'sidebar content aside';
```

## Modification Plan

### 1. Chat Hub as Persistent Panel ✨ PRIORITY

**Goal**: Make Chat Hub appear on ALL pages as a collapsible panel, not just dedicated chat routes.

**Files to Modify**:

#### A. Enhance BaseLayout (`src/app/layouts/BaseLayout.vue`)
- **Current**: 'aside' slot only shows when AppChatPanel is present
- **Change**: Always reserve space for aside, add collapsible state management
- **Add**: CSS classes for expanded/collapsed aside states
- **Add**: Transition animations for collapse/expand

#### B. Enhance AppChatPanel (`src/app/components/app/AppChatPanel.vue`)  
- **Current**: Only renders AssistantsHub
- **Change**: Add collapse/expand button, state persistence
- **Add**: Toggle button in panel header
- **Add**: Width adjustment logic (expanded: 400px, collapsed: 60px)

#### C. Enhance chatPanel.store (`src/features/ai/assistant/chatPanel.store.ts`)
- **Current**: Basic width tracking
- **Add**: `collapsed: boolean` state
- **Add**: `toggleCollapsed()` action
- **Add**: Local storage persistence for panel state

#### D. Update App.vue (`src/app/App.vue`)
- **Current**: Only shows AppChatPanel when layoutRef exists
- **Change**: Always show AppChatPanel, pass collapse state

**Implementation Notes**:
- Preserve existing ChatLayout for dedicated chat routes
- Chat panel should maintain state across route changes
- Use CSS transforms for smooth collapse animations

### 2. New Sidebar Navigation Items

**Goal**: Add CrystalClaw-specific navigation to the main sidebar.

**Files to Modify**:

#### A. MainSidebar.vue (`src/app/components/MainSidebar.vue`)
- **Add**: Soul Editor menu item (`/soul-editor` route)
- **Add**: Memory Browser menu item (`/memory-browser` route)  
- **Add**: Skills Registry menu item (`/skills-registry` route)
- **Add**: CrystalClaw section separator

#### B. Router Configuration (`src/app/router.ts`)
- **Add**: New routes for CrystalClaw views
- **Add**: Route meta for CrystalClaw-specific layouts if needed

**New Navigation Items**:
```javascript
{
  icon: 'user-circle',
  label: 'Soul Editor',
  route: '/soul-editor',
  description: 'Manage agent identity & persona'
},
{
  icon: 'database', 
  label: 'Memory Browser',
  route: '/memory-browser',
  description: 'View & edit agent memory tables'
},
{
  icon: 'puzzle-piece',
  label: 'Skills Registry', 
  route: '/skills-registry',
  description: 'Workflow-based agent skills'
}
```

### 3. New Views & Components

**Create New Files**:

#### A. Soul Editor View
- **File**: `src/app/views/SoulEditorView.vue`
- **Purpose**: Agent identity management interface
- **Features**: Persona editing, memory configuration, behavioral settings

#### B. Memory Browser View  
- **File**: `src/app/views/MemoryBrowserView.vue`
- **Purpose**: Data Tables viewer/editor for agent memory
- **Features**: Table browser, search, edit capabilities

#### C. Skills Registry View
- **File**: `src/app/views/SkillsRegistryView.vue` 
- **Purpose**: Workflow-based skills management
- **Features**: Skill installation, configuration, workflow mapping

### 4. Settings Integration

**Goal**: Add CrystalClaw settings to existing Settings area.

**Files to Modify**:

#### A. Settings Router (`src/features/settings/` area)
- **Add**: CrystalClaw settings section
- **Add**: Agent configuration settings
- **Add**: Memory management settings

#### B. SettingsSidebar.vue (`src/app/components/SettingsSidebar.vue`)
- **Add**: "OpenClaw Agent" settings section

### 5. Branding Integration

**Goal**: Add CrystalClaw branding alongside n8n's existing brand.

**Files to Modify**:

#### A. MainSidebarHeader.vue (`src/app/components/MainSidebarHeader.vue`)
- **Add**: CrystalClaw logo/badge (small, non-intrusive)
- **Add**: "Powered by OpenClaw" subtitle or badge

#### B. AboutModal.vue (`src/app/components/AboutModal.vue`)
- **Add**: CrystalClaw version and attribution
- **Add**: OpenClaw project links

### 6. State Management

**Create New Stores**:

#### A. CrystalClaw Core Store  
- **File**: `src/app/stores/crystalclaw.store.ts`
- **Purpose**: Core CrystalClaw state management
- **State**: Agent configuration, active skills, memory connection

#### B. Soul Editor Store
- **File**: `src/app/stores/soulEditor.store.ts`  
- **Purpose**: Agent persona and identity management
- **State**: Persona data, behavior settings, memory preferences

#### C. Skills Store
- **File**: `src/app/stores/skills.store.ts`
- **Purpose**: Agent skills and workflow mappings
- **State**: Available skills, skill configurations, workflow connections

## Implementation Order

### Phase 1: Chat Hub Persistence (Week 1)
1. Enhance BaseLayout for persistent aside panel
2. Add collapse/expand functionality to AppChatPanel
3. Update chatPanel store with persistence
4. Test across all existing routes

### Phase 2: Navigation & Routing (Week 1)  
1. Add new routes to router
2. Enhance MainSidebar with CrystalClaw items
3. Create basic view components (empty states)
4. Verify navigation flow

### Phase 3: Core Views (Week 2)
1. Implement Soul Editor view
2. Implement Memory Browser view  
3. Implement Skills Registry view
4. Add state management stores

### Phase 4: Settings & Polish (Week 2)
1. Integrate CrystalClaw settings
2. Add branding elements
3. Testing and refinement

## Technical Notes

### CSS Grid Compatibility
- Existing BaseLayout CSS Grid is flexible and can accommodate our changes
- Aside panel width changes will work with existing `grid-template-columns: auto 1fr auto`

### State Persistence  
- Use n8n's existing localStorage patterns for panel state
- Leverage existing Pinia store patterns for state management

### Styling Consistency
- Follow n8n's design system (`@n8n/design-system`)
- Use existing component patterns and CSS conventions
- Maintain accessibility standards

### Bundle Size Considerations
- New components should be lazy-loaded where possible
- Use existing n8n components and patterns to minimize bundle impact

## Success Criteria

✅ **Chat Hub Persistent**: Chat panel appears on every page, collapsible, state persisted
✅ **Navigation Enhanced**: New CrystalClaw items in sidebar, proper routing
✅ **Views Functional**: Soul Editor, Memory Browser, Skills Registry accessible and functional  
✅ **Settings Integrated**: CrystalClaw settings in main settings area
✅ **Branding Added**: CrystalClaw branding present but non-intrusive
✅ **State Management**: Proper stores for CrystalClaw data
✅ **Existing Features Preserved**: All original n8n functionality unchanged

---

*This plan transforms n8n's editor into CrystalClaw while preserving its core workflow editing capabilities and adding OpenClaw agent features.*