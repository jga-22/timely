<script setup lang="ts">
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
    <div class="login-card">
      <h1 class="login-title">Sign in to Timely</h1>
      <button type="button" class="btn btn-primary login-action" :disabled="busy" @click="google">Continue with Google</button>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    </div>
  </main>
</template>
