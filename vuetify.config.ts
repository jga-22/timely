import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

// Palette mirrors the Harada prototype (blue accent, ink, soft grey, hairline).
// Keep in sync with the CSS tokens in app/assets/css/main.css.
export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'timely',
    themes: {
      timely: {
        dark: false,
        colors: {
          background: '#ffffff',
          surface:    '#ffffff',
          'on-surface': '#1a2230',
          'on-background': '#1a2230',
          primary:    '#1b4b8f',
          secondary:  '#6b7385',
          accent:     '#1b4b8f',
          error:      '#a33a3a',
          info:       '#3d4657',
          success:    '#2d6a4f',
          warning:    '#8a5a12',
        }
      },
      timelyDark: {
        dark: true,
        colors: {
          background: '#0f1624',
          surface:    '#0f1624',
          'on-surface': '#e6ebf3',
          'on-background': '#e6ebf3',
          primary:    '#86aee8',
          secondary:  '#98a2b5',
          accent:     '#86aee8',
          error:      '#ee9a9a',
          info:       '#c4cbd8',
          success:    '#7fc4a0',
          warning:    '#e8bd7a',
        }
      }
    }
  },
  icons: { defaultSet: 'mdi' },
  defaults: {}
})
