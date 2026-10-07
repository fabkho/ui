import type { RouterConfig } from '@nuxt/schema'
import { createWebHistory } from 'vue-router'
import { keepsForeignLayers, listenForBack } from './composables/useBackDismiss'

// The system Back closes the sheet or dialog on top instead of leaving the page
// (composables/useBackDismiss.ts): its popstate listener goes on before the
// router's own, and the router lets a Back off another layer's entry pass.
// Nuxt merges this with the app's router.options.ts; an app with a history of
// its own wraps it the same way (README.md, Router).
export default {
  history: (base) => {
    listenForBack()
    return keepsForeignLayers(createWebHistory(base))
  },
} satisfies RouterConfig
