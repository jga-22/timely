import { defineNuxtModule } from 'nuxt/kit'
import { PREPAINT_SCRIPT } from './app/utils/prepaint'

// https://nuxt.com/docs/api/configuration/nuxt-config

// Vercel Web Analytics (page views, no cookies). Vercel serves the script at /_vercel/insights/script.js, so it is added
// only when building on Vercel (the VERCEL env var): locally the path does not exist. The @vercel/analytics package does the
// same, but its peer ranges (vue-router 4, an optional Svelte/Vite 8 chain) break `npm install` with this dependency set.
const vercelAnalytics = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.VERCEL
  ? [
      { innerHTML: 'window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}' },
      { src: '/_vercel/insights/script.js', defer: true },
    ]
  : []
// The living style guide (app/dev/StyleGuide.vue) is the page /_styleguide: in dev, and in a build with TIMELY_STYLEGUIDE=1.
// A normal production build adds no route, so the page is not in its output.
const styleGuideModule = defineNuxtModule({
  meta: { name: 'timely-styleguide' },
  setup(_options, nuxt) {
    const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
    if (!nuxt.options.dev && env?.TIMELY_STYLEGUIDE !== '1') return
    nuxt.hook('pages:extend', (pages) => {
      pages.push({ name: 'styleguide', path: '/_styleguide', file: '~/dev/StyleGuide.vue' })
    })
  },
})

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', styleGuideModule],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // 'local' (default) or 'supabase'. NUXT_PUBLIC_STORAGE, NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY override these
      storage: 'local',
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },
  app: {
    head: {
      title: 'Timely',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      script: [
        ...vercelAnalytics,
        // Before first paint: the saved theme, motion and part of the day on <html> (utils/prepaint.ts; the nonce is added by server/plugins/security.ts)
        { tagPosition: 'head', innerHTML: PREPAINT_SCRIPT },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap'
        },
        { rel: 'icon', type: 'image/png', href: '/timely_logo.png' },
      ],
    },
  },
})
