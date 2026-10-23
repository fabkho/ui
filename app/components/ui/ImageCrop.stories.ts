import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'
import UiImageCrop from './ImageCrop.vue'
import UiButton from './Button.vue'

/** A 1600 × 1000 test picture drawn on a canvas: gridded, with a marker at the centre, so a pan or a zoom shows. */
function picture(): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 1000
  const c = canvas.getContext('2d')!
  const sky = c.createLinearGradient(0, 0, 1600, 1000)
  sky.addColorStop(0, '#d9a066')
  sky.addColorStop(1, '#3f6e8c')
  c.fillStyle = sky
  c.fillRect(0, 0, 1600, 1000)
  c.strokeStyle = 'rgba(255,255,255,.35)'
  c.lineWidth = 4
  for (let x = 0; x <= 1600; x += 200) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1000); c.stroke() }
  for (let y = 0; y <= 1000; y += 200) { c.beginPath(); c.moveTo(0, y); c.lineTo(1600, y); c.stroke() }
  c.fillStyle = '#fff'
  c.beginPath()
  c.arc(800, 500, 180, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#b3402a'
  c.beginPath()
  c.arc(800, 500, 90, 0, Math.PI * 2)
  c.fill()
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.src = canvas.toDataURL('image/png')
  })
}

const meta = {
  title: 'Base/ImageCrop',
  component: UiImageCrop,
  parameters: { docs: { description: { component: 'A square window over a picture for a profile or group photo: drag or pinch, the wheel, a zoom slider and +/− buttons, the arrow keys to pan. A round or square mask; `crop()` gives back a JPEG Blob of at most `output` px.' } } },
  args: { shape: 'round', output: 1024, image: undefined as unknown as HTMLImageElement },
  render: args => ({
    components: { UiImageCrop, UiButton },
    setup() {
      const image = shallowRef<HTMLImageElement>()
      const cropper = useTemplateRef<InstanceType<typeof UiImageCrop>>('cropper')
      const result = ref('')
      onMounted(async () => (image.value = await picture()))
      async function done() {
        const blob = await cropper.value?.crop()
        if (blob) result.value = `${blob.type}, ${blob.size > 0 ? 'ok' : 'empty'}`
      }
      return { args, image, result, done }
    },
    template: `
      <div class="mx-auto flex max-w-[360px] flex-col gap-lg bg-surface p-md">
        <UiImageCrop v-if="image" ref="cropper" v-bind="args" :image="image" />
        <UiButton block @click="done">Use photo</UiButton>
        <p class="text-body text-ink-muted" role="status" data-testid="result">{{ result }}</p>
      </div>`,
  }),
} satisfies Meta<typeof UiImageCrop>
export default meta
type Story = StoryObj<typeof meta>

/** The circle an avatar will show; the corners stay visible, dimmed, because the upload is the whole square. */
export const Round: Story = {}

/** A group photo or a cover that is shown square. */
export const Square: Story = { args: { shape: 'square' } }

/** `output` caps the Blob's side: 256 px for a group picture. */
export const SmallOutput: Story = { args: { output: 256 } }

export const Night: Story = { globals: { theme: 'night' } }

/**
 * Keyboard only: Tab to the area, the arrows pan it, + and − zoom (the slider follows), the slider sets the zoom,
 * and "Use photo" cuts a JPEG.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const area = await canvas.findByRole('group', { name: 'Crop area' })
    const slider = canvas.getByRole('slider', { name: 'Zoom' }) as HTMLInputElement
    expect(slider.getAttribute('aria-valuetext')).toBe('100 %')
    area.focus()
    expect(area).toHaveFocus()
    expect(area).toHaveAccessibleDescription(/Arrow keys/)
    const img = area.querySelector('img')!
    const before = img.style.transform
    await userEvent.keyboard('{ArrowLeft}')
    await waitFor(() => expect(img.style.transform).not.toBe(before))
    await userEvent.keyboard('+')
    await waitFor(() => expect(slider.value).toBe('1.25'))
    expect(slider).toHaveAccessibleName('Zoom')
    expect(slider.getAttribute('aria-valuetext')).toBe('125 %')
    await userEvent.keyboard('-')
    await waitFor(() => expect(slider.value).toBe('1'))
    // The slider is a native range (the browser steps it with the arrows; user-event does not model that), so set it as an input would.
    await fireEvent.input(slider, { target: { value: '2' } })
    await waitFor(() => expect(slider.getAttribute('aria-valuetext')).toBe('200 %'))
    await userEvent.click(canvas.getByRole('button', { name: 'Use photo' }))
    await waitFor(() => expect(canvas.getByTestId('result')).toHaveTextContent('image/jpeg, ok'))
  },
}

/** The zoom buttons are 44 px targets and step the slider; at the ends they disable. */
export const ZoomButtons: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const slider = (await canvas.findByRole('slider', { name: 'Zoom' })) as HTMLInputElement
    const out = canvas.getByRole('button', { name: 'Zoom out' })
    expect(out).toBeDisabled()
    expect(out.getBoundingClientRect().width).toBeGreaterThanOrEqual(44)
    await userEvent.click(canvas.getByRole('button', { name: 'Zoom in' }))
    await waitFor(() => expect(slider.value).toBe('1.25'))
    expect(out).toBeEnabled()
  },
}
