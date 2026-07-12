// Light-weight helpers shared by the AI-fill UI and the extraction module.
// Kept free of the Anthropic SDK / SheetJS imports so the modal chrome can load
// without pulling in the heavy extraction chunk (see llm.ts, loaded on demand).

/** Models offered in the UI. Sonnet is the cheaper default; Opus for hard PDFs. */
export type AiModel = 'claude-sonnet-5' | 'claude-opus-4-8'
export const AI_MODELS: AiModel[] = ['claude-sonnet-5', 'claude-opus-4-8']
export const DEFAULT_AI_MODEL: AiModel = 'claude-sonnet-5'

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
export const isImage = (f: File) =>
  f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.name)
export const isExcel = (f: File) => /sheet|excel/i.test(f.type) || /\.(xlsx|xls|xlsm|ods)$/i.test(f.name)

/** Files the picker accepts. */
export function isSupportedFile(f: File): boolean {
  return (
    isPdf(f) ||
    isImage(f) ||
    isExcel(f) ||
    /\.(csv|txt|tsv)$/i.test(f.name) ||
    f.type.startsWith('text/')
  )
}
