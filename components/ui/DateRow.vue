<script setup lang="ts">
import UiRow from './Row.vue'
// A day in a RowGroup (Libellus' DateRow, "Finished on · Today · 3 Oct"): the calendar icon (or `icon`), the
// label, the day in words, a chevron. The whole row is the platform's own date picker (an invisible
// `<input type="date">` laid over it), so on a phone a tap opens the native wheel or calendar. `min` and `max`
// keep impossible days out of the picker where the platform honours them; the caller checks the day again either
// way. `v-model` is `YYYY-MM-DD`, or '' when the picker was cleared (`placeholder` says what an empty day means).
// The input carries `testid`.
// Added for Bookretreats: the layer imports no app copy and has no `useDays`, so the day in words is the caller's
// (`text`, shown instead of the ISO day) and `icon` picks the mark (the birthday's cake).
import type { IconName } from './Icon.vue'

const model = defineModel<string>({ required: true })
withDefaults(
  defineProps<{
    label: string
    testid: string
    /** The day as it reads (the app formats it); the ISO day without. */
    text?: string
    icon?: IconName
    min?: string
    max?: string
    invalid?: boolean
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
    <span class="figures text-caption" :class="invalid ? 'text-error' : model ? 'text-ink-muted' : 'text-ink-faint'">
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
