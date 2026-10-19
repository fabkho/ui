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
      /**
       * The chat's words (`utils/chat/*`, and the chat components to come). The shape follows
       * Bookretreats' `copy/chat.ts`, and unlike the words above the defaults are German: they are
       * that app's, which fills the same keys from its copy. Keys are added with the components
       * that say them; an app overrides what it needs.
       */
      chat: {
        /** A BCP 47 tag: the language the weekdays and months of a day separator are spelled in (`Intl`). */
        locale: 'de',
        /** Day separators; older days are written out by `dayLabel`. */
        today: 'Heute',
        yesterday: 'Gestern',
        /** Answering one message: what a quote says for a message that is not words. */
        reply: {
          /** One's own message is quoted with this, as in WhatsApp. */
          you: 'Du',
          voice: '🎤 Sprachnachricht',
          gif: 'GIF',
          photo: 'Foto',
          /** A message whose content was withdrawn (`Quoted.gone`). */
          gone: 'Nicht mehr verfügbar',
        },
        /** A picture whose sender is gone. */
        media: {
          photoRemoved: 'Foto entfernt',
          gifRemoved: 'GIF entfernt',
        },
        voice: {
          bubble: {
            /** Its sender is gone: the recording went with them. */
            removed: 'Sprachnachricht entfernt',
          },
        },
      },
    },
  },
})
