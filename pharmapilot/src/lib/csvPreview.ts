/** Lecture locale (navigateur) des premières lignes d'un CSV, pour aperçu uniquement. */
export interface CsvPreview {
  delimiter: string;
  headers: string[];
  rows: string[][];
  sampledLines: number;
}

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export async function previewCsv(file: File, maxRows = 8): Promise<CsvPreview> {
  const text = await file.slice(0, 64 * 1024).text();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Le dernier morceau peut être tronqué par la limite de 64 Ko.
  if (file.size > 64 * 1024) lines.pop();
  const first = lines[0] ?? "";
  const delimiter = [";", ",", "\t", "|"].reduce((best, d) => (first.split(d).length > first.split(best).length ? d : best), ";");
  return {
    delimiter,
    headers: splitLine(first, delimiter),
    rows: lines.slice(1, maxRows + 1).map((l) => splitLine(l, delimiter)),
    sampledLines: Math.max(0, lines.length - 1),
  };
}
