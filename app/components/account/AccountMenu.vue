<script setup lang="ts">
import { accountInitials, avatarLabel, needsSaveAttention, saveLabel } from '~/utils/account'
import type { MotionChoice } from '~/utils/prefs'

/**
 * The account menu in the topbar (Supabase mode shows the name and Sign out; local mode shows "Local mode"): the avatar and its menu
 * with the save status, the Motion choice, Replay first run, Reset my data and Sign out. The theme is the top bar's button, not a row here.
 * Escape closes it and returns focus to the avatar, and a click or tap outside closes it. On desktop the first control takes
 * focus, on a phone the menu panel does (FR-UX-9).
 * Reset my data opens its dialog in the shell (`reset`), so the dialog stays where it always was.
 */
const emit = defineEmits<{ reset: [] }>()

const firstRun = useFirstRun()
const { state: auth, signOut } = useAuth()
const { status: storageStatus } = useStorageStatus()
const { choice, motion, setChoice } = useMotion()
/** Lively or Calm (FR-UX, Motion): the choice is kept in this browser */
const MOTION_OPTIONS: { value: MotionChoice; label: string }[] = [
  { value: 'lively', label: 'Lively' },
  { value: 'calm', label: 'Calm' },
]
/** The system asks for less motion: the page is calm whatever the choice, and the note says why */
const forcedCalm = computed(() => choice.value === 'lively' && motion.value === 'calm')
const accountOpen = ref(false)
const accountRef = ref<HTMLElement | null>(null)
const avatarRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

/** Replay first run (FR-ONB-7): with a plan already in the account it asks first (app.vue shows the confirmation); an empty plan starts at once */
/** Avatar initials from the Google name or the email; '' shows the person glyph (local mode, or no letters) */
const initials = computed(() => (auth.value.status === 'signed-in' && auth.value.user ? accountInitials(auth.value.user.name, auth.value.user.email) : ''))

const attention = computed(() => needsSaveAttention(storageStatus.value.state))

const avatarText = computed(() => avatarLabel(auth.value.status === 'signed-in' ? auth.value.user?.name || auth.value.user?.email : '', storageStatus.value.state))

/** Opens the menu; on desktop the first control takes focus (the Motion choice), on a phone the menu panel does (app/utils/focus.ts) */
const toggleAccount = async () => {
  accountOpen.value = !accountOpen.value
  if (!accountOpen.value) return
  await nextTick()
  focusEditField(menuRef.value?.querySelector<HTMLElement>('.account-motion button'), menuRef.value)
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

/** The dialog returns focus to the avatar when it closes, so the avatar takes it here, before the menu (and its button) goes */
const openReset = () => {
  avatarRef.value?.focus()
  accountOpen.value = false
  emit('reset')
}

const onReplayFirstRun = () => {
  accountOpen.value = false
  firstRun.askReplay()
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
        <div class="account-motion">
          <p class="account-motion-label">Motion</p>
          <UiSegmented :model-value="choice" :options="MOTION_OPTIONS" label="Motion" @update:model-value="setChoice" />
          <p v-if="forcedCalm" class="account-note">Your system asks for less motion, so Calm is in use.</p>
        </div>

        <button v-if="storageStatus.state !== 'loading'" type="button" class="account-item" @click="onReplayFirstRun">
          <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5-6-3.5Z" /></svg>
          <span class="account-label">Replay first run</span>
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
