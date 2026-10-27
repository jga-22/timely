<script setup lang="ts">
/**
 * The sign-in page (Supabase mode, signed out): one centred column. The product line and the headline, then the intro player
 * (looping, autoplay; no sound, frameless on the page surface), then the sign-in block and the consent line. Shown by app.vue.
 */
const { signInWithGoogle } = useAuth()

const error = ref('')
const busy = ref(false)

const google = async () => {
  busy.value = true
  error.value = ''

  const message = await signInWithGoogle()

  if (message) {
    busy.value = false
    error.value = message
  }
}
</script>

<template>
  <main class="login-gate">
    <div class="login-main">
      <div class="login-intro">
        <p class="login-mark">Timely</p>
        <h1 class="login-heading">Your goals decide your week</h1>
        <p class="login-lede">Set a 5-year ambition, give your goals time in your week, and see where your hours go.</p>
      </div>

      <div class="login-showcase">
        <OnboardingIntroPlayer loop quiet />
      </div>

      <div class="login-action-block">
        <h2 class="login-title">Sign in to Timely</h2>
        <button type="button" class="btn btn-primary login-action" :disabled="busy" @click="google">Continue with Google</button>
        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      </div>

      <p class="login-consent">
        By continuing you agree to the <NuxtLink to="/terms" class="legal-link">Terms of Use</NuxtLink> and the
        <NuxtLink to="/privacy" class="legal-link">Privacy Policy</NuxtLink>.
      </p>
    </div>
  </main>
</template>
