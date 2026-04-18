import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'timely',
    themes: {
      timely: {
        dark: false,
        colors: {
          background: '#faf9f6',
          surface:    '#faf9f6',
          primary:    '#d97757',
          secondary:  '#8a857d',
          accent:     '#d97757',
          error:      '#a04040',
          info:       '#3c4b63',
          success:    '#6b8f5a',
          warning:    '#b5893a',
        }
      }
    }
  },
  icons: { defaultSet: 'mdi' },
  defaults: {}
})
