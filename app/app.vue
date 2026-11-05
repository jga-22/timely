<script setup lang="ts">
import { localDateKey } from '~/utils/dates'
import { LEGAL_ROUTES } from '~/utils/legal'

const router = useRouter()
// Terms and Privacy render with or without a session, so the sign-in gate never hides them (no planner data is loaded for them)
const legalPage = computed(() => LEGAL_ROUTES.includes(router.currentRoute.value.path))
// The style guide (dev, app/dev) is a reading page: the first-run flow does not open over it
const styleGuidePage = computed(() => router.currentRoute.value.path === '/_styleguide')
// Dark mode and motion: applied before first paint by the head script (utils/prepaint.ts); these keep them in step after that
useTheme()
useMotion()
// Old ?tab= links are rewritten once to the three surfaces (FR-NAV-5)
useNavSync()
const { today } = usePlannerYear()
const { state: auth } = useAuth()
const resetOpen = ref(false)
// The rail, the tab bar and the account menu show when there is a planner to open: local mode, or a signed-in session
const showShell = computed(() => auth.value.status === 'off' || auth.value.status === 'signed-in')
// The first run (FR-ONB) is a full page with no shell. Client only: its state is set before hydration, so the server markup keeps the shell and
// `firstRunShown` turns on after mount (the same rule as the planner views)
const { active: firstRunActive, replayAsk, toast } = useFirstRun()
// The one shell toast (a milestone or the calm line after a tick on Today, slice 11): at most one a day
const { toast: appToast, dismiss: dismissAppToast } = useMilestoneToast()
const firstRunShown = ref(false)
const syncFirstRun = () => {
  firstRunShown.value = firstRunActive.value && !legalPage.value && !styleGuidePage.value
}

onMounted(() => {
  // Date-dependent views read this only after mount, so server and client render the same first pass
  today.value = localDateKey()
  syncFirstRun()
})
watch([firstRunActive, legalPage, styleGuidePage], syncFirstRun)
</script>

<template>
  <div class="app">
    <!-- The ambient glow of the time of day (Lively only; Calm hides it in shell.css). Decorative, behind the page -->
    <div class="ambient" aria-hidden="true" />

    <!-- The first stop on the page: it moves focus past the navigation to the main landmark (FR-NAV-7) -->
    <a class="shell-skip" href="#main">Skip to content</a>

    <ShellAppRail v-if="showShell && !firstRunShown" />

    <div class="shell-column">
      <ShellAppTopBar v-if="!firstRunShown" :show-account="showShell" @reset="resetOpen = true" />

      <FirstRunPage v-if="firstRunShown" />
      <template v-else>
        <AuthLoginGate v-if="auth.status === 'signed-out' && !legalPage" />
        <NuxtPage v-else-if="legalPage || auth.status !== 'loading'" />
      </template>

      <!-- Also on the sign-in gate and the legal pages; hidden only while the session is loading -->
      <footer v-if="auth.status !== 'loading'" class="app-footer">
        <NuxtLink to="/terms">Terms</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/privacy">Privacy</NuxtLink>
      </footer>
    </div>

    <ShellAppTabBar v-if="showShell && !firstRunShown" />
  </div>
  <!-- Client only: the dialogs and the toast are set after mount, so the server markup must not contain them -->
  <ClientOnly>
    <FirstRunReplayDialog v-if="replayAsk" />
    <FirstRunToast v-if="toast && !firstRunShown" />
    <ShellAppToast v-if="appToast" :key="appToast.id" :title="appToast.title" :line="appToast.line" :kind="appToast.kind === 'milestone' ? 'sprout' : 'ring'" @dismiss="dismissAppToast" />
    <AccountResetDataDialog v-if="resetOpen" @close="resetOpen = false" />
  </ClientOnly>
  <NuxtRouteAnnouncer />
</template>
