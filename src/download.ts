import JSZip from 'jszip'
import type { GtfsFile } from './gtfs'

/** Trigger a browser download of a Blob under the given filename. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Download a single GTFS text file. */
export function downloadFile(file: GtfsFile) {
  saveBlob(new Blob([file.content], { type: 'text/plain;charset=utf-8' }), file.name)
}

/** Build a zip of all files in the browser and download it. */
export async function downloadZip(files: GtfsFile[], zipName: string) {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveBlob(blob, zipName)
}
