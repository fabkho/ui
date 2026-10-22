<script setup lang="ts">
import UiAvatarStack, { type AvatarStackFace } from './AvatarStack.vue'
import UiIcon from './Icon.vue'
import { useUiText } from '../../composables/useUiText'
import { fillWords } from '../../utils/chat/words'

// One thread in a list of threads (a chapter of a buddy read, a section by page or percent): its number in
// mono, its title, who is in it (`faces`, a UiAvatarStack), how many comments it has, an unread dot and a
// chevron. The row is one button (48 px, `open` on a tap or Enter / Space) with ONE accessible name, made of
// the number, the title and the counts: "Chapter 9, Part two, 12 comments, 3 new". The faces, the dot and the
// chevron are decoration inside it (`facesLabel` adds the sentence the stack would have said: "Lena and Sofia
// are here").
//
// A `veiled` row is a thread the reader has not reached: it draws the number, the count and the faces only,
// the title is neither drawn nor spoken nor in the DOM ("Chapter 9, hidden, 12 comments"), and no unread dot
// (a veiled thread's news is a spoiler too). The counts are numbers, never message text.
const props = withDefaults(
  defineProps<{
    /** The thread's number in mono ("9", "p. 120"). */
    number: string | number
    /** The title; never shown or spoken while `veiled`. */
    title?: string
    /** How many comments. Default: `0`. */
    count?: number
    /** How many are new to the reader; a dot shows when above 0 (not on a veiled row). Default: `0`. */
    unread?: number
    /** Who is in the thread. Default: none. */
    faces?: readonly AvatarStackFace[]
    /** The thread is out of reach (a spoiler): number, count and faces only. Default: `false`. */
    veiled?: boolean
    /** What the number is called aloud ("Chapter 9"); default: the number. */
    label?: string
    /** Said after the counts for the faces ("Lena and Sofia are here"); default: nothing. */
    facesLabel?: string
    /** The test ids' start: `thread.row`, … Default: `thread`. */
    testid?: string
  }>(),
  { title: undefined, count: 0, unread: 0, faces: () => [], veiled: false, label: undefined, facesLabel: undefined, testid: 'thread' },
)
const emit = defineEmits<{
  /** The row was pressed. */
  open: []
}>()

const uiText = useUiText()
const words = computed(() => uiText.value.threadRow)
const countText = computed(() => (props.count === 1 ? words.value.commentsOne : fillWords(words.value.comments, { count: props.count })))
const unreadText = computed(() => fillWords(words.value.unread, { count: props.unread }))
const showsUnread = computed(() => !props.veiled && props.unread > 0)
const name = computed(() =>
  [
    props.label ?? String(props.number),
    props.veiled ? words.value.veiled : props.title,
    countText.value,
    showsUnread.value ? unreadText.value : null,
    props.facesLabel,
  ]
    .filter(Boolean)
    .join(', '),
)
</script>

<template>
  <button
    type="button"
    class="thread-row relative flex min-h-(--size-row) w-full items-center gap-ms px-inset text-left text-body not-disabled:hover:bg-fill active:bg-fill-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    :class="veiled ? 'text-ink-faint' : 'text-ink'"
    :aria-label="name"
    :data-testid="`${testid}.row`"
    :data-veiled="veiled || undefined"
    @click="emit('open')"
  >
    <span class="figures min-w-8 shrink-0 text-caption" :class="veiled ? 'text-ink-faint' : 'text-ink-muted'" aria-hidden="true">{{ number }}</span>
    <span class="min-w-0 flex-1 truncate" aria-hidden="true" :data-testid="`${testid}.title`">
      <UiIcon v-if="veiled" name="eyeOff" :size="16" class="text-ink-faint" />
      <template v-else>{{ title }}</template>
    </span>
    <span v-if="faces.length" class="shrink-0" aria-hidden="true">
      <UiAvatarStack :faces="faces" size="xs" :max="3" />
    </span>
    <span class="figures shrink-0 text-caption" :class="veiled ? 'text-ink-faint' : 'text-ink-muted'" aria-hidden="true" :data-testid="`${testid}.count`">{{ count }}</span>
    <span v-if="showsUnread" class="size-(--spacing-sm) shrink-0 rounded-pill bg-accent" aria-hidden="true" :data-testid="`${testid}.unread`" />
    <UiIcon name="chevron" :size="15" bold class="-mr-xs shrink-0 text-ink-ghost" aria-hidden="true" />
  </button>
</template>

<style scoped>
.thread-row + .thread-row::before {
  position: absolute;
  top: 0;
  right: 0;
  left: var(--spacing-inset);
  height: var(--stroke-hairline);
  content: '';
  background: var(--color-hairline-strong);
}
</style>
