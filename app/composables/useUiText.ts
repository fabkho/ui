/**
 * The words the layer's components say themselves, from the app config
 * (`ui.text`, app.config.ts): the app sets them, the layer never imports its
 * copy. Reactive, so an app that switches language calls `updateAppConfig`.
 */
export function useUiText() {
  const config = useAppConfig()
  return computed(() => config.ui.text)
}
