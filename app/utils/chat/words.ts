/**
 * The chat's words with a blank in them (`ui.text.chat`): `'{name} from you'`. The app config holds
 * strings only (it is merged and may be filled from i18n), so a sentence that takes a name, a number or
 * a search is a template, and the component fills it in here. A placeholder the values do not name
 * stays as it is, so a missing value shows up instead of reading as an empty word.
 *
 * An app whose copy is functions hands them over filled with the placeholder itself:
 * `pick: chat.reactions.pick('{name}')`.
 *
 * Not auto-imported: import from `#layers/ui/app/utils/chat/words`.
 */
export function fillWords(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}
