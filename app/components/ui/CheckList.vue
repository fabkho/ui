<script lang="ts">
export interface CheckListOption {
  id: string
  label: string
  /** A quiet second line under the label. */
  sublabel?: string
  /** Anything the app wants for `face` (a photo URL, initials): the slot gets the whole option. */
  face?: unknown
}
</script>

<script setup lang="ts">
import UiCheckbox from './Checkbox.vue'
import { useUiText } from '../../composables/useUiText'
import { filterOptions, toggled } from '../../utils/checkList'
import { fillWords } from '../../utils/chat/words'

// A list to choose several from (the members of a group, the friends of a buddy read): a filter field, a
// checkbox row for each option (a face from the `face` slot, the label, a quiet `sublabel`), and a count line
// ("2 of 5 selected"). `v-model` is the ids chosen, in the order they were ticked; a filter hides rows, it never
// changes the choice, and the count counts everything chosen.
//
// Pattern: an APG checkbox group (a `<fieldset>` named by `label`, one native `<input type="checkbox">` each),
// not a multi-select listbox. A picker with a filter is a form: native checkboxes are Tab-reachable, Space ticks,
// VoiceOver says "checked, 2 of 5" and switches on touch work as with any checkbox, where a listbox with
// `aria-multiselectable` is a desktop widget with arrow-key selection that iOS VoiceOver and Switch Control
// handle poorly (and a listbox cannot hold a field's controls or links). The rows are 44 px high (UiCheckbox).
//
// `max`: at the limit the unticked rows are disabled (native: announced "dimmed"), ticked ones stay free to take
// back; the count line says "5 of 5". `min`: the count line adds "Choose at least 2." while fewer are chosen; the
// app owns the button that goes on (it knows `modelValue.length >= min`). The count line is a live region
// (polite), so a screen reader hears the number change, and says that nobody matches a filter.
const props = defineProps<{
  /** The group's accessible name ("Members"); drawn nowhere, the screen's own heading is the visible one. */
  label: string
  /** What can be chosen. */
  options: readonly CheckListOption[]
  /** The most that can be chosen. Default: no limit. */
  max?: number
  /** The least that is needed: the count line says so while there are fewer. Default: `0`. */
  min?: number
  /** Hides the filter field (a short list). Default: `false`. */
  noFilter?: boolean
  /** The test ids' start: `checkList` → `checkList.filter`, `checkList.option.<id>`. Default: `checkList`. */
  testid?: string
}>()
/** The ids chosen, in the order they were ticked. */
const model = defineModel<string[]>({ required: true })

const uiText = useUiText()
const words = computed(() => uiText.value.checkList)
const uid = useId()
const query = ref('')
const shown = computed(() => filterOptions(props.options, query.value))
const testid = computed(() => props.testid ?? 'checkList')
const full = computed(() => props.max !== undefined && model.value.length >= props.max)

const count = computed(() =>
  props.max !== undefined
    ? fillWords(words.value.countMax, { count: model.value.length, max: props.max })
    : fillWords(words.value.count, { count: model.value.length }),
)
const need = computed(() => (props.min && model.value.length < props.min ? fillWords(words.value.atLeast, { min: props.min }) : ''))
const status = computed(() => [count.value, need.value, query.value && !shown.value.length ? words.value.none : ''].filter(Boolean).join(' '))

function set(id: string, on: boolean) {
  model.value = toggled(model.value, id, on, props.max)
}
</script>

<template>
  <fieldset class="m-0 flex min-w-0 flex-col border-0 p-0" :data-testid="testid">
    <legend class="sr-only">{{ label }}</legend>
    <div v-if="!noFilter" class="pb-xs">
      <label :for="`${uid}-filter`" class="sr-only">{{ words.filter }}</label>
      <input
        :id="`${uid}-filter`"
        v-model="query"
        type="search"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="search"
        :placeholder="words.filter"
        class="min-h-(--size-touch) w-full border-b-(length:--stroke-rule) border-hairline-strong bg-transparent text-input text-ink caret-accent outline-none transition-colors duration-(--duration-quick) ease-standard placeholder:text-ink-faint focus:border-accent"
        :data-testid="`${testid}.filter`"
      />
    </div>
    <!-- The count, for the eye and (a live region) for the ear. -->
    <p class="pb-xs text-footnote text-ink-faint" role="status" :data-testid="`${testid}.count`">{{ status }}</p>
    <ul class="m-0 flex list-none flex-col p-0">
      <li v-for="option in shown" :key="option.id">
        <UiCheckbox
          :model-value="model.includes(option.id)"
          :center="!!$slots.face"
          :disabled="full && !model.includes(option.id)"
          :aria-describedby="option.sublabel ? `${uid}-${option.id}-sub` : undefined"
          :data-testid="`${testid}.option.${option.id}`"
          @update:model-value="set(option.id, $event)"
        >
          <span class="flex items-center gap-ms" :class="full && !model.includes(option.id) && 'opacity-50'">
            <span v-if="$slots.face" class="flex shrink-0" aria-hidden="true"><slot name="face" :option="option" /></span>
            <span class="flex min-w-0 flex-col">
              <span class="break-words text-body text-ink">{{ option.label }}</span>
              <span v-if="option.sublabel" :id="`${uid}-${option.id}-sub`" class="break-words text-caption text-ink-faint">
                {{ option.sublabel }}
              </span>
            </span>
          </span>
        </UiCheckbox>
      </li>
    </ul>
  </fieldset>
</template>
