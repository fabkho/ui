<script setup lang="ts">
import UiButton from './Button.vue'
import { useKeyboardViewport } from '../../composables/useKeyboardInset'
import { useModalLayer } from '../../composables/useModalLayer'
import { useUiText } from '../../composables/useUiText'
// A confirmation for something that cannot be taken back (deleting a read,
// removing a Book from the Library). It rises over a scrim above everything,
// sheets included: the question in the serif, what is lost beneath it, the
// destructive action and Cancel. Closed by Cancel, a tap on the scrim, Escape
// or the system Back — never while the action runs. A refusal stays in the dialog with its
// reason and the same button tries again. `testid` names the dialog; the
// action and Cancel get `<testid>.confirm` and `<testid>.cancel`, a refusal
// `<testid>.error`. `offline` (#15): the action stays, disabled, and says
// "Offline" (UiButton); Cancel still closes it. `alternative`: a safe way out
// offered above the destructive action (Sign out with changes waiting to sync:
// "Sync first", #93), `<testid>.alternative`.
// The default slot (added for Bookretreats): more under the sentence, such as
// a field for a reason (the Orga's ban). With such a field's keyboard up
// (added for Bookretreats) the dialog stands on the keyboard as a sheet does,
// never taller than what the keyboard leaves in view (its card scrolls, the
// field kept in view), and the page holds still under it
// (composables/useKeyboardInset.ts, `pin`).
import { revealDelta, sheetLift } from '../../utils/keyboard'
import { useKeyboardInset } from '../../composables/useKeyboardInset'

const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(
  defineProps<{
    title: string
    text?: string
    action: string
    busy?: boolean
    error?: string | null
    offline?: boolean
    alternative?: string
    /** `primary` (added for Bookretreats): an action that can be taken back (Freigeben) in ink, not red. */
    tone?: 'danger' | 'primary'
    testid: string
  }>(),
  { text: undefined, busy: false, error: null, offline: false, alternative: undefined, tone: 'danger' },
)
const emit = defineEmits<{ confirm: []; alternative: [] }>()

const uiText = useUiText()

function close() {
  if (!props.busy) open.value = false
}

const scrim = useTemplateRef<HTMLElement>('scrim')
const panel = useTemplateRef<HTMLElement>('panel')
// Above everything, a sheet under it included: the rest is out of reach while
// it asks, and focus goes back to what asked once it closes (useModalLayer).
// Back closes it as Cancel does (never while the action runs).
const { afterLeave } = useModalLayer(open, { elements: () => [scrim.value, panel.value], initialFocus: () => panel.value, close })

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // Only the dialog closes: a sheet under it keeps its own Escape for later.
  event.stopImmediatePropagation()
  close()
}
watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) window.addEventListener('keydown', onKeydown, true)
  else window.removeEventListener('keydown', onKeydown, true)
})
onUnmounted(() => import.meta.client && window.removeEventListener('keydown', onKeydown, true))

// ------------------------------------------------------------- the keyboard

const card = useTemplateRef<HTMLElement>('card')
const { inset: keyboard, room } = useKeyboardViewport(() => open.value, { pin: true })
/** How far the dialog sits up to clear the keyboard (its home-indicator padding may go behind it). */
const lift = computed(() => {
  if (!keyboard.value || !panel.value) return 0
  return sheetLift(keyboard.value, Number.parseFloat(getComputedStyle(panel.value).paddingBottom) || 0)
})
/** Scrolls the card (and only it) so the focused field shows whole above the keyboard. */
function revealFocused() {
  const scroller = card.value
  const field = document.activeElement
  if (!scroller || !(field instanceof HTMLElement) || !scroller.contains(field)) return
  const margin = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spacing-md')) || 0
  const delta = revealDelta(scroller.getBoundingClientRect(), field.getBoundingClientRect(), margin)
  if (delta) scroller.scrollTop += delta
}
watch(lift, async () => {
  await nextTick()
  revealFocused()
})
function onFocusin() {
  if (lift.value) revealFocused()
}
// `translate`, not `transform`: the way in and out is the transform.
const panelStyle = computed(() => ({
  translate: lift.value ? `0 ${-lift.value}px` : undefined,
  '--dialog-lift': `${lift.value}px`,
  '--dialog-room': room.value === null ? undefined : `${room.value}px`,
}))

const titleId = useId()
const textId = useId()
</script>

<template>
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="open" ref="scrim" class="fixed inset-0 z-60 touch-none bg-scrim" aria-hidden="true" :data-testid="`${testid}.scrim`" @click="close" />
    </Transition>
    <Transition name="dialog" @after-leave="afterLeave">
      <section
        v-if="open"
        ref="panel"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="text ? textId : undefined"
        tabindex="-1"
        class="dialog safe-bottom screen-bottom fixed inset-x-0 z-70 mx-auto flex w-full max-w-(--size-max-content) flex-col px-ml outline-none"
        :style="panelStyle"
        :data-testid="testid"
        @focusin="onFocusin"
      >
        <div ref="card" class="mb-sm min-h-0 overflow-y-auto overscroll-contain rounded-xl bg-surface-sheet px-ml pt-ml pb-ml shadow-sheet edge">
          <h2 :id="titleId" class="book-title text-headline text-balance" :data-testid="`${testid}.title`">{{ title }}</h2>
          <p v-if="text" :id="textId" class="mt-sm text-subhead text-ink-muted" :data-testid="`${testid}.text`">{{ text }}</p>
          <!-- Added for Bookretreats: what the question needs besides its sentence (a ban's reason). -->
          <div v-if="$slots.default" class="mt-ms flex flex-col gap-ms"><slot /></div>
          <p v-if="error" class="mt-ms text-caption text-error" role="alert" :data-testid="`${testid}.error`">{{ error }}</p>
          <div class="mt-lg flex flex-col gap-sm">
            <UiButton
              v-if="alternative"
              block
              :disabled="busy"
              :aria-busy="busy"
              :data-testid="`${testid}.alternative`"
              @click="emit('alternative')"
            >
              {{ alternative }}
            </UiButton>
            <UiButton
              block
              :tone="tone"
              :disabled="busy"
              :offline="offline"
              :aria-busy="busy"
              :data-testid="`${testid}.confirm`"
              @click="emit('confirm')"
            >
              {{ action }}
            </UiButton>
            <UiButton block tone="quiet" :disabled="busy" :data-testid="`${testid}.cancel`" @click="close">
              {{ uiText.cancel }}
            </UiButton>
          </div>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Never above the screen's top: no taller than the page (less the keyboard it
   stands on), nor than what the keyboard leaves in view. Rides up and down with
   the keyboard on its curve. */
.dialog {
  max-height: min(
    calc(100dvh - var(--bar-top) - var(--spacing-sm) - var(--dialog-lift, 0px)),
    calc(var(--dialog-room, 100dvh) - var(--bar-top) - var(--spacing-sm))
  );
  transition: translate var(--duration-keyboard) var(--ease-keyboard);
}
.dialog-enter-active {
  transition: transform var(--duration-sheet) var(--ease-sheet);
}
.dialog-leave-active {
  transition: transform var(--duration-sheet-exit) var(--ease-exit);
}
.dialog-enter-from,
.dialog-leave-to {
  transform: translateY(calc(100% + var(--spacing-xl)));
}

.scrim-enter-active {
  transition: opacity var(--duration-sheet) var(--ease-standard);
}
.scrim-leave-active {
  transition: opacity var(--duration-sheet-exit) var(--ease-exit);
}
.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}
</style>
