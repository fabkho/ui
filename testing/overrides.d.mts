export interface LayerOverride {
  kind: 'component' | 'composable' | 'util'
  /** `UiCover`, `useSheetTouch`, `settle`. */
  name: string
  /** The base's file, relative to its `app/` folder (`components/ui/Cover.vue`). */
  base: string
  /** The outer file, relative to its `app/` folder. */
  outer: string
  /** The outer `app/` folder (absolute). */
  outerApp: string
}
export declare function componentName(relativePath: string): string
export declare function layerOverrides(options?: { app?: string | string[]; layer?: string; cwd?: string }): LayerOverride[]
export declare function describeOverride(override: LayerOverride, who?: string, from?: string): string
export declare function sameFolder(a: string, b: string): boolean
