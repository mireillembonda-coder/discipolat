/**
 * Lecture locale d'un CSV pour l'aperçu d'importation (aucun envoi réseau).
 * Gère les séparateurs ; , et tabulation, ainsi que les champs entre guillemets.
 */
export interface CsvPreview {
  fileName?: string
  delimiter: string
  headers: string[]
  rows: string[][]
  totalRows: number
}

function detectDelimiter(line: string) {
  const candidates = [';', ',', '\t']
  return candidates.map((d) => ({ d, n: line.split(d).length })).sort((a, b) => b.n - a.n)[0]!.d
}

function parseLine(line: string, d: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === d) {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  out.push(cur.trim())
  return out
}

export function parseCsvPreview(text: string, maxRows = 10): CsvPreview {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { delimiter: ';', headers: [], rows: [], totalRows: 0 }
  const delimiter = detectDelimiter(lines[0]!)
  return {
    delimiter,
    headers: parseLine(lines[0]!, delimiter),
    rows: lines.slice(1, 1 + maxRows).map((l) => parseLine(l, delimiter)),
    totalRows: lines.length - 1,
  }
}
