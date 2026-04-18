import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'timely',
    themes: {
      timely: {
        dark: false,
        colors: {
          background: '#f6f1e8',
          surface: '#fffaf4',
          primary: '#1b675c',
          secondary: '#6f6254',
          accent: '#b45309',
          error: '#b42318',
          info: '#155e75',
          success: '#2e7d32',
          warning: '#b26a00'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi'
  },
  defaults: {
    VCard: {
      rounded: 'xl',
      elevation: 0
    },
    VBtn: {
      rounded: 'lg',
      elevation: 0
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: true
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: true
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: true
    }
  }
})
