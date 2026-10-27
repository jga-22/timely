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
const { status: storageStatus } = useStorageStatus()
const { state: auth, signOut } = useAuth()
const planner = usePlannerStore()
const onboarding = useOnboarding()
const accountOpen = ref(false)
const resetOpen = ref(false)

/** Replays the tour from Plan your week; without an ambition and a life area there is nothing to tour, so the welcome opens instead (FR-ONB-7) */
const replayTour = () => {
  if (planner.ambition && planner.categories.length) onboarding.startTour()
  else onboarding.openWelcome()
}

const onSignOut = async () => {
  accountOpen.value = false
  await signOut()
}

const openReset = () => {
  accountOpen.value = false
  resetOpen.value = true
}

const storageLabels = { loading: 'Loading', saving: 'Saving', saved: 'Saved', error: 'Not saved' }

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

        <nav v-if="auth.status === 'off' || auth.status === 'signed-in'" class="tabs" role="tablist" aria-label="Sections">
          <button
            v-for="entry in TABS"
            :key="entry.id"
            role="tab"
            class="tab"
            :aria-selected="tab === entry.id"
            @click="go(entry.id)"
          >
            <span v-if="entry.num" class="tab-num" aria-hidden="true">{{ entry.num }}</span>
            {{ entry.label }}
          </button>
        </nav>
        <div v-else class="topbar-spacer" aria-hidden="true" />

        <span
          v-if="auth.status === 'signed-in'"
          class="storage-status"
          :data-state="storageStatus.state"
          role="status"
          :title="storageStatus.message || undefined"
        >
          <span class="storage-status-dot" aria-hidden="true" />
          {{ storageLabels[storageStatus.state as keyof typeof storageLabels] }}
        </span>

        <div v-if="auth.status === 'off' || auth.status === 'signed-in'" class="account">
          <button
            type="button"
            class="account-button"
            aria-haspopup="true"
            :aria-expanded="accountOpen"
            @click="accountOpen = !accountOpen"
            @keydown.esc="accountOpen = false"
          >
            Account
          </button>
          <div v-if="accountOpen" class="account-menu">
            <p v-if="auth.status === 'signed-in'" class="account-email">{{ auth.user?.email }}</p>
            <button v-if="auth.status === 'signed-in'" type="button" class="btn btn-sm" @click="onSignOut">Sign out</button>
            <button type="button" class="btn btn-sm btn-danger" :disabled="storageStatus.state === 'loading'" @click="openReset">Reset my data</button>
          </div>
        </div>

        <button
          v-if="(auth.status === 'off' || auth.status === 'signed-in') && storageStatus.state !== 'loading'"
          type="button"
          class="tour-button"
          @click="replayTour"
        >
          Tour
        </button>

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

      <AuthLoginGate v-if="auth.status === 'signed-out' && !legalPage" />
      <NuxtPage v-else-if="legalPage || auth.status !== 'loading'" />

      <footer v-if="auth.status === 'off' || auth.status === 'signed-in'" class="app-footer">
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
