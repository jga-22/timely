<script setup lang="ts">
import { useTheme } from 'vuetify'
import { localDateKey } from '~/utils/dates'
import { LEGAL_ROUTES } from '~/utils/legal'

const router = useRouter()
const { tab, go } = useNav()
// Terms and Privacy render with or without a session, so the sign-in gate never hides them (no planner data is loaded for them)
const legalPage = computed(() => LEGAL_ROUTES.includes(router.currentRoute.value.path))
const dark = useState('dark', () => false)
const theme = useTheme()
const { today } = usePlannerYear()
const { state: auth } = useAuth()
const resetOpen = ref(false)

// Not immediate: the stored value is applied before first paint (nuxt.config.ts head script), and onMounted reads it below
watch(dark, (v) => {
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', v ? 'dark' : '')
    theme.global.name.value = v ? 'timelyDark' : 'timely'
  }
})

onMounted(() => {
  const saved = localStorage.getItem('timely.dark')
  if (saved !== null) dark.value = saved === 'true'
  // Date-dependent views read this only after mount, so server and client render the same first pass
  today.value = localDateKey()
})
</script>

<template>
  <VApp>
    <div class="app">
      <header class="topbar">
        <div class="brand">timely</div>

        <nav v-if="auth.status === 'off' || auth.status === 'signed-in'" class="tabs" role="tablist" aria-label="Sections">
          <button
            v-for="entry in TABS"
            :key="entry.id"
            role="tab"
            class="tab"
            :aria-selected="tab === entry.id"
            @click="go(entry.id)"
          >
            {{ entry.label }}
          </button>
        </nav>
        <div v-else class="topbar-spacer" aria-hidden="true" />

        <!-- The account menu (avatar, save status, Dark mode, Replay tour, Reset my data, Sign out); its dialog opens here -->
        <AccountMenu v-if="auth.status === 'off' || auth.status === 'signed-in'" @reset="resetOpen = true" />
      </header>

      <AuthLoginGate v-if="auth.status === 'signed-out' && !legalPage" />
      <NuxtPage v-else-if="legalPage || auth.status !== 'loading'" />

      <!-- Also on the sign-in gate and the legal pages; hidden only while the session is loading -->
      <footer v-if="auth.status !== 'loading'" class="app-footer">
        <NuxtLink to="/terms">Terms</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/privacy">Privacy</NuxtLink>
      </footer>
    </div>
    <!-- Client only: the first-run state is set before hydration, so the server markup must not contain it -->
    <!-- Hidden on the legal pages only: the state is kept, so Welcome or the tour shows again on Home -->
    <ClientOnly>
      <OnboardingFlow v-if="!legalPage" />
      <OnboardingIntro v-if="!legalPage" />
      <OnboardingTour v-if="!legalPage" />
      <AccountResetDataDialog v-if="resetOpen" @close="resetOpen = false" />
    </ClientOnly>
    <NuxtRouteAnnouncer />
  </VApp>
</template>
