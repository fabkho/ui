<script lang="ts">
/** Every icon the layer draws: Libellus' set (its docs/DESIGN.md, Icons) and the ones Bookretreats added. */
export type IconName =
  | 'home'
  | 'library'
  | 'search'
  | 'back'
  | 'plus'
  | 'minus'
  | 'more'
  | 'close'
  | 'check'
  | 'grip'
  | 'chevron'
  | 'down'
  | 'calendar'
  | 'lock'
  | 'mail'
  | 'repeat'
  | 'slash'
  | 'stack'
  | 'globe'
  | 'pencil'
  | 'flag'
  | 'arrow'
  | 'sun'
  | 'moon'
  | 'signOut'
  | 'trash'
  | 'offline'
  | 'sync'
  | 'import'
  | 'camera'
  | 'torch'
  | 'ebook'
  | 'read'
  | 'contents'
  | 'translate'
  | 'define'
  | 'copy'
  | 'leading0'
  | 'leading1'
  | 'leading2'
  | 'leading3'
  | 'margins0'
  | 'margins1'
  | 'margins2'
  | 'margins3'
  // Added for Bookretreats, on the same grid:
  | 'map'
  | 'people'
  | 'chat'
  | 'orga'
  | 'person'
  | 'gear'
  | 'send'
  | 'eyeOff'
  | 'bell'
  | 'heart'
  | 'eye'
  | 'download'
  | 'doc'
  | 'book'
  | 'shield'
  | 'star'
  | 'cake'
  | 'ticket'
  | 'history'
  | 'userPlus'
  | 'quote'
  | 'drop'
</script>

<script setup lang="ts">
// The icon set: a 24-unit grid, hairline strokes with round caps, stroke =
// currentColor, so an icon takes the colour of its text. Decorative: the
// control around it carries the label. `bold` is the active tab's weight.
withDefaults(defineProps<{ name: IconName; size?: number; bold?: boolean }>(), { size: 22, bold: false })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
    :style="{ strokeWidth: bold ? 'var(--stroke-icon-bold)' : 'var(--stroke-icon)' }"
  >
    <template v-if="name === 'home'">
      <path d="M4.5 10.2 12 4l7.5 6.2V19a1 1 0 0 1-1 1h-4v-5.5h-5V20h-4a1 1 0 0 1-1-1z" />
    </template>
    <template v-else-if="name === 'library'">
      <path d="M5 4.5h3.2v15H5zM10.2 4.5h3.2v15h-3.2z" />
      <path d="m15.4 6.1 3.1-.8 3 13.6-3.1.8z" />
    </template>
    <template v-else-if="name === 'search'"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.5 4.5" /></template>
    <template v-else-if="name === 'back'"><path d="M14.5 5.5 8 12l6.5 6.5" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 5.5v13M5.5 12h13" /></template>
    <template v-else-if="name === 'minus'"><path d="M5.5 12h13" /></template>
    <template v-else-if="name === 'more'">
      <circle cx="5.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'close'"><path d="m7 7 10 10M17 7 7 17" /></template>
    <template v-else-if="name === 'check'"><path d="m5.5 12.5 4 4L18.5 7.5" /></template>
    <template v-else-if="name === 'grip'"><path d="M6 9h12M6 12h12M6 15h12" /></template>
    <template v-else-if="name === 'chevron'"><path d="m9.5 6 6 6-6 6" /></template>
    <template v-else-if="name === 'down'"><path d="m7 10 5 5 5-5" /></template>
    <template v-else-if="name === 'calendar'">
      <rect x="4.5" y="5.5" width="15" height="14" rx="2" /><path d="M4.5 10h15M9 3.5v4M15 3.5v4" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </template>
    <template v-else-if="name === 'mail'">
      <rect x="3.5" y="6" width="17" height="12.5" rx="2" /><path d="m4.5 7.5 7.5 6 7.5-6" />
    </template>
    <template v-else-if="name === 'repeat'">
      <path d="M5 11V9.5A2.5 2.5 0 0 1 7.5 7H18m-2.5-2.5L18 7l-2.5 2.5" />
      <path d="M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H6m2.5 2.5L6 17l2.5-2.5" />
    </template>
    <template v-else-if="name === 'slash'"><circle cx="12" cy="12" r="7.5" /><path d="m6.8 17.2 10.4-10.4" /></template>
    <template v-else-if="name === 'stack'">
      <rect x="4" y="7" width="10" height="13" rx="1.2" /><path d="M8 4.5h8.8A1.2 1.2 0 0 1 18 5.7V17" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.3 2.4 3.3 5 3.3 8s-1 5.6-3.3 8c-2.3-2.4-3.3-5-3.3-8s1-5.6 3.3-8z" />
    </template>
    <template v-else-if="name === 'pencil'"><path d="M15 5.5 18.5 9 9 18.5H5.5V15z" /></template>
    <template v-else-if="name === 'flag'"><path d="M6 20.5V4.5M6 5h11l-2.5 4 2.5 4H6" /></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" /></template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M6 18l1.3-1.3M16.7 7.3 18 6" />
    </template>
    <template v-else-if="name === 'moon'"><path d="M19 14.6A7.5 7.5 0 0 1 9.4 5 7.5 7.5 0 1 0 19 14.6z" /></template>
    <template v-else-if="name === 'offline'">
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.8 10.03 4 4 0 0 0 7 18z" /><path d="m4.5 4.5 15 15" />
    </template>
    <template v-else-if="name === 'sync'">
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.8 10.03 4 4 0 0 0 7 18z" /><path d="M12 15.5v-5m-2 2 2-2 2 2" />
    </template>
    <template v-else-if="name === 'import'">
      <path d="M12 4.5v10m-3.5-3.5 3.5 3.5 3.5-3.5" /><path d="M5 14.5v3.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-3.5" />
    </template>
    <template v-else-if="name === 'camera'">
      <path d="M4.5 8.5A1.5 1.5 0 0 1 6 7h2l1.3-2h5.4L16 7h2a1.5 1.5 0 0 1 1.5 1.5V17A1.5 1.5 0 0 1 18 18.5H6A1.5 1.5 0 0 1 4.5 17z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </template>
    <template v-else-if="name === 'torch'"><path d="M13.2 3.5 6.5 13.2h4.8l-.5 7.3 6.7-9.7h-4.8z" /></template>
    <template v-else-if="name === 'trash'">
      <path d="M5 7h14M9.5 7V5.2a.7.7 0 0 1 .7-.7h3.6a.7.7 0 0 1 .7.7V7" /><path d="M6.8 7l.7 11.3a1.2 1.2 0 0 0 1.2 1.2h6.6a1.2 1.2 0 0 0 1.2-1.2L17.2 7M10 10.5v5.5M14 10.5v5.5" />
    </template>
    <!-- An ebook on the device (#131): a reader's screen with a page of lines. -->
    <template v-else-if="name === 'ebook'">
      <rect x="6" y="3.5" width="12" height="17" rx="2" /><path d="M9 8h6M9 11h6M9 14h3.5" />
    </template>
    <!-- The reader (#131 phase 2). An open book: Read now, the pages layout. -->
    <template v-else-if="name === 'read'">
      <path d="M12 6.5C10.2 5.2 7.6 4.6 4 4.75v13.5c3.6-.15 6.2.45 8 1.75 1.8-1.3 4.4-1.9 8-1.75V4.75c-3.6-.15-6.2.45-8 1.75Z" /><path d="M12 6.5V20" />
    </template>
    <!-- Contents: a list with its bullets. -->
    <template v-else-if="name === 'contents'">
      <path d="M9 7h11M9 12h11M9 17h11" />
      <circle cx="4.75" cy="7" r=".9" fill="currentColor" stroke="none" />
      <circle cx="4.75" cy="12" r=".9" fill="currentColor" stroke="none" />
      <circle cx="4.75" cy="17" r=".9" fill="currentColor" stroke="none" />
    </template>
    <!-- Translate: a character and a letter A. -->
    <template v-else-if="name === 'translate'">
      <path d="M3.5 5.5h9M8 4v1.5M10.5 5.5c-.6 3.4-3 6.3-6.5 7.8M6 8.6c1 1.9 2.7 3.5 4.8 4.4" /><path d="M12.5 20l3.75-9 3.75 9M13.9 16.8h4.7" />
    </template>
    <!-- Define: a dictionary. -->
    <template v-else-if="name === 'define'">
      <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" /><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H18M9 8.5h5" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </template>
    <!-- Line spacing, tight to airy: four lines of text set closer or further apart. -->
    <path v-else-if="name === 'leading0'" d="M5 8.5h14M5 11h14M5 13.5h14M5 16h9" />
    <path v-else-if="name === 'leading1'" d="M5 7h14M5 10.5h14M5 14h14M5 17.5h9" />
    <path v-else-if="name === 'leading2'" d="M5 5.5h14M5 10h14M5 14.5h14M5 19h9" />
    <path v-else-if="name === 'leading3'" d="M5 4h14M5 9.5h14M5 15h14M5 20.5h9" />
    <!-- Margins, edge to edge to wide: a page with its text set wider or narrower. -->
    <template v-else-if="name.startsWith('margins')">
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path v-if="name === 'margins0'" d="M5.5 7h13M5.5 10h13M5.5 13h13M5.5 16h13M5.5 19h8" />
      <path v-else-if="name === 'margins1'" d="M7 8h10M7 11h10M7 14h10M7 17h6" />
      <path v-else-if="name === 'margins2'" d="M8.5 8h7M8.5 11h7M8.5 14h7M8.5 17h4" />
      <path v-else d="M10 8h4M10 11h4M10 14h4M10 17h2.5" />
    </template>
    <template v-else-if="name === 'signOut'">
      <path d="M13.5 4.5h-7a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h7" /><path d="M10.5 12h9m-3-3 3 3-3 3" />
    </template>
    <!-- Added for Bookretreats (its tabs, settings, profile and Orga), on the same grid. -->
    <!-- The map: a folded paper map with its creases, and the pin of a place on it. -->
    <template v-else-if="name === 'map'">
      <path d="M9 4.5 4 6.3v13.2l5-1.8 6 1.8 5-1.8V4.3l-5 1.8z" />
      <path d="M9 4.5v13.2M15 6.3v13.2" />
    </template>
    <!-- Friends: two faces, the nearer one whole. -->
    <template v-else-if="name === 'people'">
      <circle cx="9.3" cy="8.8" r="3.3" />
      <path d="M3.8 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.4 6.1a3.3 3.3 0 0 1 .3 6.4M17 14.9c2.1.5 3.5 2.3 3.5 4.6" />
    </template>
    <!-- A conversation: a speech bubble with two lines. -->
    <template v-else-if="name === 'chat'">
      <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h10a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 16H10l-4 3.5V16H7a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M8.5 9h7M8.5 12h4.5" />
    </template>
    <!-- Orga: a key, the Orga's own mark in Bookretreats. -->
    <template v-else-if="name === 'orga'">
      <circle cx="8.5" cy="9.5" r="4" />
      <path d="m11.4 12.4 7 7M16.2 17.2l1.6-1.6M14 15l1.6-1.6" />
    </template>
    <template v-else-if="name === 'person'">
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </template>
    <template v-else-if="name === 'gear'">
      <circle cx="12" cy="12" r="3.1" />
      <path
        d="M12 3.6l1.2 2 2.3-.3.6 2.2 2.1 1-.8 2.2.8 2.2-2.1 1-.6 2.2-2.3-.3-1.2 2-1.2-2-2.3.3-.6-2.2-2.1-1 .8-2.2-.8-2.2 2.1-1 .6-2.2 2.3.3z"
      />
    </template>
    <!-- Send: a paper plane, for the chat's composer. -->
    <template v-else-if="name === 'send'"><path d="M20 4 4 10.6l6.4 2.6L13 19.6z" /><path d="m10.4 13.2 3.2-3.2" /></template>
    <template v-else-if="name === 'eyeOff'">
      <path d="M4 12.5s3.2-5 8-5c1 0 2 .2 2.8.6M20 12.5s-3.2 5-8 5c-1.4 0-2.6-.4-3.6-1" />
      <path d="m4.5 4.5 15 15" />
    </template>
    <!-- Push: a bell with its clapper. -->
    <template v-else-if="name === 'bell'">
      <path d="M6.5 17.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2H5z" />
      <path d="M10.2 19.5a1.9 1.9 0 0 0 3.6 0" />
    </template>
    <!-- A request: somebody reaching out. -->
    <template v-else-if="name === 'heart'">
      <path d="M12 19.5s-7.5-4.3-7.5-9A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 7.5 2.3c0 4.7-7.5 9-7.5 9z" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M4 12.5s3.2-5 8-5 8 5 8 5-3.2 5-8 5-8-5-8-5z" />
      <circle cx="12" cy="12.5" r="2.2" />
    </template>
    <!-- The export: a file coming down to the device. -->
    <template v-else-if="name === 'download'">
      <path d="M12 4v10M8.2 10.5 12 14.3l3.8-3.8" />
      <path d="M4.8 16v2.5a1.5 1.5 0 0 0 1.5 1.5h11.4a1.5 1.5 0 0 0 1.5-1.5V16" />
    </template>
    <!-- Nutzungsbedingungen: a sheet with its lines and a folded corner. -->
    <template v-else-if="name === 'doc'">
      <path d="M6 4.5h7l5 5v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" />
      <path d="M13 4.5v5h5M8.5 14h7M8.5 17h4.5" />
    </template>
    <!-- Impressum: a closed book, as Libellus draws its covers. -->
    <template v-else-if="name === 'book'">
      <path d="M6 4.5h11a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.8A1.8 1.8 0 0 1 5 17.7V5.6A1.1 1.1 0 0 1 6 4.5z" />
      <path d="M5 17h13" />
    </template>
    <!-- Blocked members, the safety mark: a shield. -->
    <template v-else-if="name === 'shield'">
      <path d="M12 4 5.5 6.3v5.4c0 4 2.7 6.9 6.5 8.3 3.8-1.4 6.5-4.3 6.5-8.3V6.3z" />
    </template>
    <!-- The Top 3: a star, drawn like Libellus' rating star. -->
    <template v-else-if="name === 'star'">
      <path d="m12 4.4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 10l5.4-.8z" />
    </template>
    <!-- A birthday: a cake with its one candle. -->
    <template v-else-if="name === 'cake'">
      <path d="M4.8 19.5h14.4v-4.2c-1.4 0-1.4 1-2.9 1s-1.4-1-2.9-1-1.4 1-2.8 1-1.4-1-2.9-1-1.4 1-2.9 1z" />
      <path d="M6.5 15.3v-2.1a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v2.1M12 11.7V8.4" />
      <path d="M12 5.6a1 1 0 0 1-1 1 1 1 0 0 1 1 1 1 1 0 0 1 1-1 1 1 0 0 1-1-1z" />
    </template>
    <!-- An invite code: a ticket with its stub. -->
    <template v-else-if="name === 'ticket'">
      <path d="M4.5 8.2A1.2 1.2 0 0 1 5.7 7h12.6a1.2 1.2 0 0 1 1.2 1.2v2a2 2 0 0 0 0 3.6v2A1.2 1.2 0 0 1 18.3 17H5.7a1.2 1.2 0 0 1-1.2-1.2v-2a2 2 0 0 0 0-3.6z" />
      <path d="M13 7.6v1.8M13 11.1v1.8M13 14.6v1.8" />
    </template>
    <!-- The log: a clock turning back. -->
    <template v-else-if="name === 'history'">
      <path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3" />
      <path d="M4.5 4.6v3.9h3.9M12 8.2V12l2.8 1.7" />
    </template>
    <!-- New this week: a member with a plus. -->
    <template v-else-if="name === 'userPlus'">
      <circle cx="10" cy="8.6" r="3.4" />
      <path d="M3.8 19.8c0-3.4 2.8-5.6 6.2-5.6 1 0 2 .2 2.8.6" />
      <path d="M17.2 14.4v5.4M14.5 17.1h5.4" />
    </template>
    <!-- Her own words: the serif quotation mark, drawn. -->
    <template v-else-if="name === 'quote'">
      <path d="M9.4 6.5C6.9 7.8 5.5 9.9 5.5 12.6v4.9h5V12H8.1c0-1.9.7-3.3 2.3-4.2zM18.4 6.5c-2.5 1.3-3.9 3.4-3.9 6.1v4.9h5V12h-2.4c0-1.9.7-3.3 2.3-4.2z" />
    </template>
    <!-- A drop of colour: the theme. -->
    <template v-else-if="name === 'drop'"><path d="M12 3.5c3.6 4.1 5.6 7.3 5.6 9.9a5.6 5.6 0 0 1-11.2 0c0-2.6 2-5.8 5.6-9.9Z" /></template>
  </svg>
</template>
