/**
 * How a sheet is put back (`UiSheet`'s `restore`): where its list was scrolled and, for a list that comes in
 * pages, how many of its rows were drawn, so the scroll lands on the row it was left on (BetterReads' Reads
 * sheet). Keeping it and handing it back is the app's (BetterReads: `composables/useSheetRestore.ts`); the
 * base only reads `scroll`.
 */
export interface SheetRestore {
  scroll: number
  /** For a list drawn in pages: how many of its rows were showing. The sheet ignores it; the app's list reads it. */
  shown?: number
}
