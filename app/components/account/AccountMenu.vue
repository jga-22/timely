<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { accountInitials, avatarLabel, needsSaveAttention, saveLabel } from '~/utils/account'

/**
 * The account menu in the topbar (Supabase mode shows the name and Sign out; local mode shows "Local mode"): the avatar and its menu
 * with the save status, Dark mode, Replay tour, Reset my data and Sign out. Escape closes it and returns focus to the avatar, and a
 * click or tap outside closes it. On desktop the first control takes focus, on a phone the menu panel does (FR-UX-9).
 * Reset my data opens its dialog in the shell (`reset`), so the dialog stays where it always was.
 */
const emit = defineEmits<{ reset: [] }>()

const planner = usePlannerStore()
const onboarding = useOnboarding()
const { state: auth, signOut } = useAuth()
const { status: storageStatus } = useStorageStatus()
const dark = useState('dark', () => false)
const accountOpen = ref(false)
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

const attention = computed(() => needsSaveAttention(storageStatus.value.state))

const avatarText = computed(() => avatarLabel(auth.value.status === 'signed-in' ? auth.value.user?.name || auth.value.user?.email : '', storageStatus.value.state))

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
  emit('reset')
}

const onReplayTour = () => {
  accountOpen.value = false
  replayTour()
}

const toggleDark = () => {
  dark.value = !dark.value
  localStorage.setItem('timely.dark', String(dark.value))
  document.documentElement.setAttribute('data-theme', dark.value ? 'dark' : '')
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointer))

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointer))
</script>

<template>
  <div ref="accountRef" class="account" @keydown.esc="onAccountEscape">
    <button
      ref="avatarRef"
      type="button"
      class="account-button"
      :aria-label="avatarText"
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
            {{ saveLabel(storageStatus.state) }}
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
</template>
