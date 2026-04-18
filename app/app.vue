<script setup lang="ts">
type TabId = 'planner' | 'insights' | 'config'

const activeTab = useState<TabId>('activeTab', () => 'planner')
const dark = useState('dark', () => false)

const TABS = [
  { id: 'planner'  as TabId, num: '01', label: 'Planner' },
  { id: 'insights' as TabId, num: '02', label: 'Insights' },
  { id: 'config'   as TabId, num: '03', label: 'Configuration' },
]

const dateLabel = 'WK 16 · APR 18'

watch(dark, (v) => {
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', v ? 'dark' : '')
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
        <div class="brand">
          <span class="brand-mark">timely<span class="brand-dot" /></span>
          <span class="brand-sub">weekly · yearly</span>
        </div>

        <nav class="tabs" role="tablist">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            role="tab"
            class="tab"
            :aria-selected="activeTab === tab.id"
            @click="activeTab = tab.id"
          >
            <span class="tab-num">{{ tab.num }}</span>
            {{ tab.label }}
          </button>
        </nav>

        <div class="topbar-right">
          <span><span class="dot" /> {{ dateLabel }}</span>
          <button class="theme-toggle" @click="toggleDark">
            <!-- Sun -->
            <svg v-if="dark" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.2" stroke="currentColor" stroke-width="1" />
              <line x1="6" y1="0.8" x2="6" y2="2.4" stroke="currentColor" stroke-width="1" />
              <line x1="6" y1="9.6" x2="6" y2="11.2" stroke="currentColor" stroke-width="1" />
              <line x1="0.8" y1="6" x2="2.4" y2="6" stroke="currentColor" stroke-width="1" />
              <line x1="9.6" y1="6" x2="11.2" y2="6" stroke="currentColor" stroke-width="1" />
              <line x1="2.3" y1="2.3" x2="3.5" y2="3.5" stroke="currentColor" stroke-width="1" />
              <line x1="8.5" y1="8.5" x2="9.7" y2="9.7" stroke="currentColor" stroke-width="1" />
              <line x1="9.7" y1="2.3" x2="8.5" y2="3.5" stroke="currentColor" stroke-width="1" />
              <line x1="3.5" y1="8.5" x2="2.3" y2="9.7" stroke="currentColor" stroke-width="1" />
            </svg>
            <!-- Moon -->
            <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9.5 7.2A3.8 3.8 0 0 1 4.8 2.5 3.8 3.8 0 1 0 9.5 7.2Z" stroke="currentColor" stroke-width="1" fill="currentColor" />
            </svg>
            {{ dark ? 'Light' : 'Dark' }}
          </button>
        </div>
      </header>

      <NuxtPage />
    </div>
    <NuxtRouteAnnouncer />
  </VApp>
</template>
