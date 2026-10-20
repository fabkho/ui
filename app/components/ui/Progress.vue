<script setup lang="ts">
// How far through a Book: D's hairline, drawn as a bar. A faint rule for the
// whole book and the lamp colour for what has been read, a hairline thick,
// growing over `standard` when the value changes. The words ("p. 212 of 480",
// "45 %") are the caller's, in tabular figures beside it; this is the picture
// and, for assistive tech, the value. `fraction` is 0–1.
const props = defineProps<{
  /** How far through, 0–1 (clamped); the bar and the value for assistive tech come from it. */
  fraction: number
  /** The bar's name for a screen reader (`aria-label`). */
  label: string
  /** What a screen reader reads for the value, in the caller's words ("Page 216 of 480"). */
  valueText: string
}>()

const percent = computed(() => Math.round(Math.min(Math.max(props.fraction, 0), 1) * 100))
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="percent"
    :aria-valuetext="valueText"
    class="bar relative w-full overflow-hidden rounded-pill bg-hairline-strong"
  >
    <span class="fill absolute inset-y-0 left-0 rounded-pill bg-accent" :style="{ width: `${percent}%` }" />
  </div>
</template>

<style scoped>
.bar {
  height: var(--stroke-focus);
}

.fill {
  transition: width var(--duration-standard) var(--ease-standard);
}
</style>
