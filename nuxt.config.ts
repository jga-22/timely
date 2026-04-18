// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', 'vuetify-nuxt-module'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Timely', // default fallback title
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/timely_logo.png' },
      ],
    },
  },
  vuetify: {
    vuetifyOptions: './vuetify.config.ts'
  }
})
