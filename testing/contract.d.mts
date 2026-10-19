export declare const LAYER_ROOT: string
export declare const OWN_VARIABLES: string[]
/** Variables the layer reads only with a fallback; an app may set them, none has to. */
export declare const OPTIONAL_VARIABLES: string[]
export declare function layerFiles(root?: string): string[]
export declare function layerContract(options: { tokensCss: string; root?: string }): {
  /** Layer files that import from the app (`~/`, `@/`, stores, i18n). */
  importsFromApp: string[]
  /** `--variables` the layer reads that neither the tokens nor the layer define. */
  missingVariables: string[]
  /** `--color-cloth<n>` the tokens lack. */
  missingCloths: string[]
  /** Raw `cubic-bezier()` or ease keywords written in the layer instead of a `--ease-*` token. */
  rawCurves: string[]
}
