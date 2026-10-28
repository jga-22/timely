<script setup lang="ts">
import { useTheme } from 'vuetify'
import { localDateKey } from '~/utils/dates'
import { LEGAL_ROUTES } from '~/utils/legal'
import { accountInitials } from '~/utils/account'

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
const accountRef = ref<HTMLElement | null>(null)
const avatarRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const themeRef = ref<HTMLButtonElement | null>(null)

/** Replays the tour from Plan your week; without an ambition and a life area with habits there is nothing to tour, so the welcome opens instead (FR-ONB-7) */
const replayTour = () => {
  if (planner.ambition && onboardedCategories(planner.$state).length) onboarding.startTour()
  else onboarding.openWelcome()
}

/** Avatar initials from the Google name or the email; '' shows the person glyph (local mode, or no letters) */
const initials = computed(() => (auth.value.status === 'signed-in' && auth.value.user ? accountInitials(auth.value.user.name, auth.value.user.email) : ''))

/** Saving and not saved get a dot on the avatar; saved, loading and local show none (the menu says it in text) */
const attention = computed(() => storageStatus.value.state === 'saving' || storageStatus.value.state === 'error')

const avatarLabel = computed(() => {
  const who = auth.value.status === 'signed-in' ? auth.value.user?.name || auth.value.user?.email : ''
  const save = storageStatus.value.state === 'error' ? ', not saved' : storageStatus.value.state === 'saving' ? ', saving' : ''
  return `Account menu${who ? `, ${who}` : ''}${save}`
})

const storageLabels = { loading: 'Loading...', saving: 'Saving...', saved: 'Saved', error: 'Not saved' }

/** Opens the menu; on desktop the first control takes focus, on a phone the menu panel does (app/utils/focus.ts) */
const toggleAccount = async () => {
  accountOpen.value = !accountOpen.value
  if (!accountOpen.value) return
  await nextTick()
  focusEditField(themeRef.value, menuRef.value)
}

/** Escape closes the menu from anywhere inside it and returns focus to the avatar */
const onAccountEscape = () => {
  if (!accountOpen.value) return
  accountOpen.value = false
  avatarRef.value?.focus()
}

/** A click or tap outside the account block closes the menu */
const onDocumentPointer = (event: PointerEvent) => {
  if (accountOpen.value && accountRef.value && !accountRef.value.contains(event.target as Node)) accountOpen.value = false
}

const onSignOut = async () => {
  accountOpen.value = false
  await signOut()
}

const openReset = () => {
  accountOpen.value = false
  resetOpen.value = true
}

const onReplayTour = () => {
  accountOpen.value = false
  replayTour()
}

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
  document.addEventListener('pointerdown', onDocumentPointer)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointer))

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
            {{ entry.label }}
          </button>
        </nav>
        <div v-else class="topbar-spacer" aria-hidden="true" />

        <div v-if="auth.status === 'off' || auth.status === 'signed-in'" ref="accountRef" class="account" @keydown.esc="onAccountEscape">
          <button
            ref="avatarRef"
            type="button"
            class="account-button"
            :aria-label="avatarLabel"
            aria-haspopup="true"
            :aria-expanded="accountOpen"
            @click="toggleAccount"
          >
            <template v-if="initials">{{ initials }}</template>
            <!-- Person glyph: local mode, or no name and no email to take letters from -->
            <svg v-else class="account-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="9" r="3.6" />
              <path d="M5.2 20c1.3-3.3 3.8-5 6.8-5s5.5 1.7 6.8 5" />
            </svg>
            <span v-if="attention" class="account-dot" :data-state="storageStatus.state" aria-hidden="true" />
          </button>
          <div v-if="accountOpen" ref="menuRef" class="account-menu" tabindex="-1">
            <div class="account-head">
              <p class="account-name">{{ auth.status === 'signed-in' ? (auth.user?.name || 'My account') : 'Local mode' }}</p>
              <p v-if="auth.status !== 'signed-in'" class="account-sub">Saved in this browser</p>
              <template v-if="storageStatus.state !== 'local'">
                <p class="account-status" :data-state="storageStatus.state" aria-live="polite">
                  <span class="account-status-dot" aria-hidden="true" />
                  {{ storageLabels[storageStatus.state as keyof typeof storageLabels] }}
                </p>
                <p v-if="storageStatus.message" class="account-status-note">{{ storageStatus.message }}</p>
              </template>
            </div>

            <div class="account-items">
              <button
                ref="themeRef"
                type="button"
                class="account-item account-switch"
                role="switch"
                :aria-checked="dark ? 'true' : 'false'"
                @click="toggleDark"
              >
                <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>
                <span class="account-label">Dark mode</span>
                <span class="account-track" aria-hidden="true"><span class="account-knob" /></span>
              </button>

              <button v-if="storageStatus.state !== 'loading'" type="button" class="account-item" @click="onReplayTour">
                <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5-6-3.5Z" /></svg>
                <span class="account-label">Replay tour</span>
              </button>
              <button type="button" class="account-item account-item-danger" :disabled="storageStatus.state === 'loading'" @click="openReset">
                <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" /></svg>
                <span class="account-label">Reset my data</span>
              </button>
              <button v-if="auth.status === 'signed-in'" type="button" class="account-item" @click="onSignOut">
                <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" /></svg>
                <span class="account-label">Sign out</span>
              </button>
            </div>
          </div>
        </div>
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
