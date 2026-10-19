import type { Preview } from '@storybook-vue/nuxt'
import { INITIAL_VIEWPORTS } from 'storybook/viewport'
import './storybook.css'

// Two themes stand in for the apps (tokens.css): one light, one dark. The toolbar sets
// `data-theme` on <html>, as an app does, so the layer's own `[data-theme]` rules apply.
const THEMES = { paper: 'Paper (light)', night: 'Night (dark)' } as const
type Theme = keyof typeof THEMES

// `prefers-reduced-motion` cannot be switched from script, so the toolbar's "Reduce motion" does two things:
// it answers `matchMedia('(prefers-reduced-motion: reduce)')` as true (what the layer's JavaScript asks, e.g.
// `utils/motion.ts`), and it sets `.reduce-motion` on <html>, which `storybook.css` uses to shorten the CSS
// transitions and animations the way the media query does. Storybook-only; the layer does not do this.
const nativeMatchMedia = window.matchMedia.bind(window)
let reduceMotion = false
window.matchMedia = (query: string) => {
  const list = nativeMatchMedia(query)
  if (query !== '(prefers-reduced-motion: reduce)') return list
  return new Proxy(list, {
    get: (target, key) => {
      if (key === 'matches') return reduceMotion
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

// The words the layer says itself (`ui.text`): the English defaults, or a German sample like an app would set.
const GERMAN = { cancel: 'Abbrechen', offline: 'Offline', etAl: 'u. a.' }

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: Object.entries(THEMES).map(([value, title]) => ({ value, title })),
        dynamicTitle: true,
      },
    },
    motion: {
      description: 'prefers-reduced-motion',
      toolbar: {
        title: 'Motion',
        icon: 'lightning',
        items: [
          { value: 'motion', title: 'Motion: as the system says' },
          { value: 'reduce', title: 'Motion: reduced' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'ui.text',
      toolbar: {
        title: 'Words',
        icon: 'globe',
        items: [
          { value: 'en', title: 'ui.text: English defaults' },
          { value: 'de', title: 'ui.text: German sample' },
        ],
        dynamicTitle: true,
      },
    },
  },
  // `VITE_STORY_THEME=night pnpm test:storybook` runs every story, and its axe check, in the dark theme.
  initialGlobals: { theme: import.meta.env.VITE_STORY_THEME === 'night' ? 'night' : 'paper', locale: 'en', motion: 'motion' },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        const appConfig = useAppConfig()
        const english = { ...appConfig.ui.text }
        watchEffect(() => {
          document.documentElement.dataset.theme = context.globals.theme as Theme
          reduceMotion = context.globals.motion === 'reduce'
          document.documentElement.classList.toggle('reduce-motion', reduceMotion)
          Object.assign(appConfig.ui.text, context.globals.locale === 'de' ? GERMAN : english)
        })
      },
      template: '<story />',
    }),
  ],
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // WCAG 2.2 AA (and the 2.1/2.0 levels it includes) plus best practices. A violation is an error in the
    // test run (`test: 'error'`), so a story with one shows red in the panel and fails in CI.
    a11y: {
      test: 'error',
      options: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } },
    },
    viewport: {
      options: {
        iphone: { name: 'iPhone 390×844', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        ...INITIAL_VIEWPORTS,
      },
    },
    backgrounds: { disabled: true },
    docs: { toc: true },
  },
  tags: ['autodocs'],
}

export default preview
