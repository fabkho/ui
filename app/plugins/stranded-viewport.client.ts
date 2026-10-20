import { watchStrandedViewport } from '../composables/useKeyboardInset'
// Fixed chrome back where it belongs after the keyboard (added for Bookretreats, r10): iOS 26 can leave the visual
// viewport panned, or the installed app's layout viewport shrunk, once the keyboard has gone, and the tab bar then
// stands far up the screen. Only WebKit on an iPhone or iPad; composables/useKeyboardInset.ts, watchStrandedViewport.
export default defineNuxtPlugin(() => {
  watchStrandedViewport()
})
