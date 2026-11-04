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

onMounted(() => {
  // Date-dependent views read this only after mount, so server and client render the same first pass
  today.value = localDateKey()
})
</script>

<template>
  <div class="app">
    <!-- The first stop on the page: it moves focus past the navigation to the main landmark (FR-NAV-7) -->
    <a class="shell-skip" href="#main">Skip to content</a>

    <ShellAppRail v-if="showShell" />

    <div class="shell-column">
      <ShellAppTopBar :show-account="showShell" @reset="resetOpen = true" />

      <AuthLoginGate v-if="auth.status === 'signed-out' && !legalPage" />
      <NuxtPage v-else-if="legalPage || auth.status !== 'loading'" />

      <!-- Also on the sign-in gate and the legal pages; hidden only while the session is loading -->
      <footer v-if="auth.status !== 'loading'" class="app-footer">
        <NuxtLink to="/terms">Terms</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/privacy">Privacy</NuxtLink>
      </footer>
    </div>

    <ShellAppTabBar v-if="showShell" />
  </div>
  <!-- Client only: the first-run state is set before hydration, so the server markup must not contain it -->
  <!-- Hidden on the legal pages only: the state is kept, so Welcome or the tour shows again on Today -->
  <ClientOnly>
    <OnboardingFlow v-if="!legalPage && !styleGuidePage" />
    <OnboardingIntro v-if="!legalPage && !styleGuidePage" />
    <OnboardingTour v-if="!legalPage && !styleGuidePage" />
    <AccountResetDataDialog v-if="resetOpen" @close="resetOpen = false" />
  </ClientOnly>
  <NuxtRouteAnnouncer />
</template>
