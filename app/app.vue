<script setup lang="ts">
import { useTheme } from 'vuetify'

type TabId = 'planner' | 'insights' | 'goals' | 'config'

const activeTab = useState<TabId>('activeTab', () => 'goals')
const dark = useState('dark', () => false)
const theme = useTheme()

const TABS = [
  { id: 'goals'    as TabId, num: '01', label: 'Goals' },
  { id: 'planner'  as TabId, num: '02', label: 'Planner' },
  { id: 'insights' as TabId, num: '03', label: 'Insights' },
  { id: 'config'   as TabId, num: '04', label: 'Configuration' },
]

watch(dark, (v) => {
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', v ? 'dark' : '')
    theme.global.name.value = v ? 'timelyDark' : 'timely'
  }
}, { immediate: true })

onMounted(() => {
  const saved = localStorage.getItem('timely.dark')
  if (saved !== null) dark.value = saved === 'true'
})

const toggleDark = () => {
  dark.value = !dark.value
  localStorage.setItem('timely.dark', String(dark.value))
  document.documentElement.setAttribute('data-theme', dark.value ? 'dark' : '')
}
</script>

<template>
  <VApp>
    <div class="app">
      <header class="topbar">
        <div class="brand">timely</div>

        <nav class="tabs" role="tablist" aria-label="Sections">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            role="tab"
            class="tab"
            :aria-selected="activeTab === tab.id"
            @click="activeTab = tab.id"
          >
            <span class="tab-num" aria-hidden="true">{{ tab.num }}</span>
            {{ tab.label }}
          </button>
        </nav>

        <button
          class="theme-toggle"
          type="button"
          :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="dark ? 'Light theme' : 'Dark theme'"
          @click="toggleDark"
        >
          <!-- Sun -->
          <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
          </svg>
          <!-- Moon -->
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          </svg>
        </button>
      </header>

      <NuxtPage />
    </div>
    <NuxtRouteAnnouncer />
  </VApp>
</template>
