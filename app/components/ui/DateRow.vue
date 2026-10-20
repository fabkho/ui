<script setup lang="ts">
import UiRow from './Row.vue'
// A day in a RowGroup (Libellus' DateRow, "Finished on · Today · 3 Oct"): the calendar icon (or `icon`), the
// label, the day in words, a chevron. The whole row is the platform's own date picker (an invisible
// `<input type="date">` laid over it), so on a phone a tap opens the native wheel or calendar. `min` and `max`
// keep impossible days out of the picker where the platform honours them; the caller checks the day again either
// way. `v-model` is `YYYY-MM-DD`, or '' when the picker was cleared (`placeholder` says what an empty day means).
// The input carries `testid`.
// `invalid` is not only a colour (WCAG 1.4.1): the day takes a struck-through calendar before it, and the input says
// `aria-invalid`, which assistive tech announces. The message itself is the caller's, next to the row (3.3.1).
// Added for Bookretreats: the layer imports no app copy and has no `useDays`, so the day in words is the caller's
// (`text`, shown instead of the ISO day) and `icon` picks the mark (the birthday's cake).
import UiIcon from './Icon.vue'
import type { IconName } from './Icon.vue'

/** The chosen day, as YYYY-MM-DD, or '' when the picker was cleared. */
const model = defineModel<string>({ required: true })
withDefaults(
  defineProps<{
    /** The row's label, which is also the date input's accessible name. */
    label: string
    /** The prefix of the tids the row and its mark carry. */
    testid: string
    /** The day as it reads (the app formats it); the ISO day without. */
    text?: string
    /** The mark before the day. Default: 'calendar'. */
    icon?: IconName
    /** The earliest day the picker offers, as YYYY-MM-DD. Default: none. */
    min?: string
    /** The latest day the picker offers, as YYYY-MM-DD. Default: none. */
    max?: string
    /** The day is impossible: it shows in the error colour with a struck-through calendar. Default: false. */
    invalid?: boolean
    /** What an empty day reads as. Default: ''. */
    placeholder?: string
  }>(),
  { text: undefined, icon: 'calendar', min: undefined, max: undefined, invalid: false, placeholder: '' },
)

/** Desktop browsers open the picker only from their own icon; ask for it on any click. */
function openPicker(event: MouseEvent) {
  const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void }
  try {
    input.showPicker?.()
  } catch {
    // Not allowed here (or already open): the input still takes the click.
  }
}
</script>

<template>
  <UiRow :label="label" :icon="icon" chevron class="active:bg-fill-strong">
    <span class="figures inline-flex items-center gap-xs text-caption" :class="invalid ? 'text-error' : model ? 'text-ink-muted' : 'text-ink-faint'">
      <UiIcon v-if="invalid" name="calendarOff" :size="14" :data-testid="`${testid}Invalid`" />
      {{ model ? (text ?? model) : placeholder }}
    </span>
    <input
      v-model="model"
      type="date"
      class="picker"
      :min="min"
      :max="max"
      :aria-label="label"
      :aria-invalid="invalid || undefined"
      :data-testid="testid"
      @click="openPicker"
    />
  </UiRow>
</template>

<style scoped>
/* Over the whole row, invisible: the row is what shows, the input what is tapped. */
.picker {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  appearance: none;
}
</style>
