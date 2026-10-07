// The few words the layer says itself (a sheet's Cancel, the Offline button, a
// cover's "et al."). The app overrides them in its own app.config.ts, or, with
// translations, keeps them current with `updateAppConfig({ ui: { text } })`
// (README.md, Copy). The layer never imports the app's copy.
export default defineAppConfig({
  ui: {
    text: {
      /** A sheet's and a dialog's way out. */
      cancel: 'Cancel',
      /** A button that writes, while the device has no connection (UiButton `offline`). */
      offline: 'Offline',
      /** After the first author when a cover names fewer than all of them. */
      etAl: 'et al.',
    },
  },
})
