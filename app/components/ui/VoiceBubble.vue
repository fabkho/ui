<script setup lang="ts">
import UiIcon from './Icon.vue'
import { useUiText } from '../../composables/useUiText'
import { canPlayHere, useVoicePlayer } from '../../composables/useVoicePlayer'
import { clock, PEAK_COUNT } from '../../utils/chat/voice'
import { fillWords } from '../../utils/chat/words'
import type { BubbleMessage } from '../../utils/chat/message'

// A voice message in the thread: the same card as a text bubble (mine ink with `on-ink` type, theirs the
// raised paper card with its hairline), holding a play button (inverted: paper on ink, ink on paper)
// whose corners are concentric with the bubble's (the bubble's radius less the inset between them; next
// to the tail corner the tail radius less the inset, see the style below), the waveform that is also
// the progress bar (the bars played so far in full ink, the rest quiet) and the time: how long it is,
// or how far it has played. One voice plays at a time (`useVoicePlayer`). The press is the button's:
// the message (UiBubble) counts it for the double-tap like and the retry of a failed one before it plays.
//
// The length comes from the message, not from the file (a recording often has none in its header), so
// there is no seeking. A recording this device cannot decode (a WebM or Ogg on an iPhone) cannot be
// played: the button is off and a line says so. Long press and double tap are the holder's.
//
// A quote slot on top (`#quote`): a recording that answers a message shows it inside the same card, over
// the play row, as a text bubble does. `tail` is the bubble's tail class (UiBubble decides it).
// Moved into the base unchanged.
const props = withDefaults(
  defineProps<{
    /** The voice message: its key, whose it is, and its media (url, mime, length, peaks). */
    item: BubbleMessage
    /** The bubble's tail class (UiBubble decides it). */
    tail: string
    /** The base of the `data-testid`s (`<testid>.voice`, `.voicePlay`, …); `chat` by default. */
    testid?: string
  }>(),
  { testid: 'chat' },
)
const emit = defineEmits<{
  /** The play button was pressed; the message counts the tap and then calls `toggle`. */
  press: [event: Event]
}>()
defineSlots<{
  /** The message this recording answers, over the play row, as a text bubble shows it. */
  quote?: () => unknown
}>()
const uiText = useUiText()
const words = computed(() => uiText.value.chat.voice.bubble)

const player = useVoicePlayer()
const media = computed(() => props.item.media!)
const mine = computed(() => props.item.mine)
const active = computed(() => player.current.key === props.item.key)
const playing = computed(() => active.value && player.current.playing)
const broken = computed(() => active.value && player.current.failed)
const unplayable = computed(() => !canPlayHere(media.value.mime ?? null))
const loading = computed(() => !media.value.url && !unplayable.value)

const total = computed(() => media.value.durationMs ?? 0)
const progress = computed(() => (active.value && total.value > 0 ? Math.min(1, player.current.positionMs / total.value) : 0))
const bars = computed(() => {
  const peaks = media.value.peaks
  return peaks && peaks.length > 0 ? peaks : Array.from({ length: PEAK_COUNT }, () => 30)
})
const played = computed(() => Math.round(progress.value * bars.value.length))
const shown = computed(() => (active.value && player.current.positionMs > 0 ? clock(player.current.positionMs / 1000) : clock(total.value / 1000, true)))
const tailAtButton = computed(() => !mine.value && props.tail !== '')
const label = computed(() => (mine.value ? words.value.mine : words.value.theirs))
const status = computed(() =>
  fillWords(words.value.position, {
    now: clock(active.value ? player.current.positionMs / 1000 : 0),
    total: clock(total.value / 1000, true),
  }),
)

/** Plays, pauses or resumes; the message asks for it once it has counted the tap. */
function toggle() {
  const url = media.value.url
  if (!url || unplayable.value) return
  player.toggle(props.item.key, url)
}
defineExpose({ toggle })
</script>

<template>
  <div
    class="bubble rounded-lg"
    :class="[tail, mine ? 'bg-ink text-on-ink' : 'edge bg-surface-raised text-ink shadow-raised']"
    :data-testid="`${testid}.voice`"
    :data-playing="playing || undefined"
    :data-failed="broken || undefined"
    :data-tail-start="tailAtButton || undefined"
    :data-playable="!unplayable || undefined"
    :data-duration="total"
  >
    <slot name="quote" />

    <div class="flex items-center gap-sm py-xs pr-ms pl-xs">
      <button
        type="button"
        class="play flex size-(--size-touch) shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        :class="mine ? 'bg-on-ink text-ink' : 'bg-ink text-on-ink'"
        :aria-label="`${label}. ${playing ? words.pause : words.play}`"
        :aria-pressed="playing"
        :disabled="unplayable || loading || undefined"
        :data-testid="`${testid}.voicePlay`"
        @click.stop="emit('press', $event)"
      >
        <UiIcon :name="playing ? 'pause' : 'play'" :size="18" />
      </button>

      <div class="min-w-0 flex-1">
        <!-- The waveform; the bars up to the play position are in full ink. -->
        <div
          class="wave flex h-(--size-button-md) items-center gap-xxs"
          role="progressbar"
          :aria-label="label"
          aria-valuemin="0"
          :aria-valuemax="Math.round(total / 1000)"
          :aria-valuenow="Math.round((active ? player.current.positionMs : 0) / 1000)"
          :aria-valuetext="status"
          :data-testid="`${testid}.voiceWave`"
          :data-played="played"
        >
          <span
            v-for="(peak, i) in bars"
            :key="i"
            class="bar flex-1 rounded-pill bg-current"
            :class="i < played ? '' : 'opacity-35'"
            :style="{ height: `${Math.max(8, Math.min(100, peak))}%` }"
          />
        </div>
        <p v-if="unplayable" class="pb-xs text-caption" :class="mine ? 'text-on-ink' : 'text-ink-muted'" :data-testid="`${testid}.voiceUnplayable`">
          {{ words.unplayable }}
        </p>
        <p v-else-if="broken" class="pb-xs text-caption" :class="mine ? 'text-on-ink' : 'text-ink-muted'" role="status" :data-testid="`${testid}.voiceFailed`">
          {{ words.playFailed }}
        </p>
      </div>

      <span class="figures shrink-0 text-caption tabular-nums" :data-testid="`${testid}.voiceTime`">{{ shown }}</span>
      <span v-if="loading" class="sr-only" role="status">{{ words.loading }}</span>
    </div>
  </div>
</template>

<style scoped>
/* The play button's corners follow the bubble's: the bubble's radius less the inset between them, so
   the two curves are concentric. The bubble's small tail corner (theirs, bottom left, last of a run) is next
   to the button; there it is the tail radius less the inset, never below square. */
.bubble {
  --voice-inset: var(--spacing-xs);
  --voice-corner: calc(var(--radius-lg) - var(--voice-inset));
  --voice-corner-tail: max(0px, calc(var(--radius-tail) - var(--voice-inset)));
}
.play {
  border-radius: var(--voice-corner);
}
.bubble[data-tail-start] .play {
  border-bottom-left-radius: var(--voice-corner-tail);
}
.bar {
  transition: opacity var(--duration-instant) var(--ease-standard);
}
</style>
