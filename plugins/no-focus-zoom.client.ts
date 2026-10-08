// No zoom on focus on iPhone (added for Bookretreats). Safari on iOS zooms the
// page in when a field with text under 16 px takes the keyboard (the chat's
// composer, set in `body`, 15 px) and leaves it zoomed after: the screen is
// then wider than the phone, the visual viewport pans over it with every
// scroll, and whatever follows the keyboard (composables/useKeyboardInset.ts)
// measures a zoomed viewport. `maximum-scale=1` stops that automatic zoom;
// since iOS 10 it no longer stops the member's own pinch zoom, which stays.
// Only on iOS (WebKit on a touch device, the only engine that knows
// `-webkit-touch-callout`): elsewhere `maximum-scale` would take pinch zoom away,
// and nothing zooms on focus there.
export default defineNuxtPlugin(() => {
  if (!CSS.supports?.('-webkit-touch-callout', 'none')) return
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta || /maximum-scale/.test(meta.content)) return
  useHead({ meta: [{ name: 'viewport', content: `${meta.content}, maximum-scale=1` }] })
})
