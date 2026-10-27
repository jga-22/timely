<script setup lang="ts">
const { signIn, signInWithGoogle } = useAuth()

const email = ref('')
const sentTo = ref<string | null>(null)
const error = ref('')
const busy = ref(false)

const send = async (address: string) => {
  const clean = address.trim()
  busy.value = true
  error.value = ''

  const message = await signIn(clean)

  busy.value = false

  if (message) {
    error.value = message
    return
  }

  sentTo.value = clean
}

const google = async () => {
  busy.value = true
  error.value = ''

  const message = await signInWithGoogle()

  if (message) {
    busy.value = false
    error.value = message
  }
}

const changeEmail = () => {
  sentTo.value = null
  error.value = ''
}
</script>

<template>
  <main class="login-gate">
    <form v-if="sentTo === null" class="login-card" @submit.prevent="send(email)">
      <h1 class="login-title">Sign in to Timely</h1>
      <button type="button" class="btn btn-primary login-action" :disabled="busy" @click="google">Continue with Google</button>
      <p class="login-or">or use an email link</p>
      <div class="field">
        <label class="field-label" for="login-email">Email</label>
        <input
          id="login-email"
          v-model="email"
          class="timely-input"
          type="email"
          autocomplete="email"
          required
          :disabled="busy"
        >
      </div>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-outline login-action" :disabled="busy || !email.trim()">Send link</button>
    </form>

    <div v-else class="login-card" role="status">
      <h1 class="login-title">Check your email</h1>
      <p class="login-sent">Link sent to <strong>{{ sentTo }}</strong></p>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <div class="login-actions">
        <button type="button" class="btn btn-outline" :disabled="busy" @click="send(sentTo)">Resend link</button>
        <button type="button" class="btn" :disabled="busy" @click="changeEmail">Use a different email</button>
      </div>
    </div>
  </main>
</template>
