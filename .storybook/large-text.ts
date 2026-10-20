/**
 * A story decorator: the text at 200 % for the story's life (WCAG 1.4.4, 1.4.10), as Android's largest font
 * scale or Safari's text zoom set it. All type, line heights and spacing of the layer are in rem, so the
 * root's font size is what they follow. Gone again when the story unmounts.
 *
 * `decorators: [largeText]`, and a play function that checks nothing is cut or runs out of the screen.
 */
export const largeText = () => ({
  setup() {
    const root = document.documentElement
    const was = root.style.fontSize
    root.style.fontSize = '200%'
    onBeforeUnmount(() => (root.style.fontSize = was))
  },
  template: '<story />',
})

/** The page does not scroll sideways: nothing sticks out of the viewport. */
export const fitsTheScreen = () => document.documentElement.scrollWidth <= document.documentElement.clientWidth

/** An element's text is whole: nothing is cut off by an ellipsis or a clip. */
export const textIsWhole = (el: HTMLElement) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1
