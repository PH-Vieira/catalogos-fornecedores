import type { ProductInput } from '@/utils/security/validate'
import { validateProductInput } from '@/utils/security/validate'

export const IMPORT_TEMPLATE_CSV = `codigo,descricao,estoque,preco
SKU-001,Produto exemplo,10,29.90
SKU-002,Outro produto,5,49.90`

export const MAX_IMPORT_ROWS = 500

const HEADER_ALIASES: Record<string, keyof ProductInput> = {
  codigo: 'code',
  code: 'code',
  sku: 'code',
  referencia: 'code',
  descricao: 'description',
  description: 'description',
  nome: 'description',
  produto: 'description',
  estoque: 'stock',
  stock: 'stock',
  qtd: 'stock',
  quantidade: 'stock',
  preco: 'price',
  price: 'price',
  valor: 'price',
}

export type ParsedImportRow =
  | { lineNumber: number; ok: true; data: ProductInput }
  | { lineNumber: number; ok: false; error: string; preview: Record<string, string> }

export type ParseImportResult = {
  rows: ParsedImportRow[]
  valid: ProductInput[]
  errors: ParsedImportRow[]
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function detectDelimiter(sampleLine: string): ',' | ';' | '\t' {
  let comma = 0
  let semi = 0
  let tab = 0
  let inQuotes = false
  for (const ch of sampleLine) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes) {
      if (ch === ',') comma++
      else if (ch === ';') semi++
      else if (ch === '\t') tab++
    }
  }
  if (semi >= comma && semi >= tab && semi > 0) return ';'
  if (tab > comma && tab > semi) return '\t'
  return ','
}

/** Parser CSV/TSV com campos entre aspas. */
export function parseDelimitedText(text: string, delimiter?: ',' | ';' | '\t'): string[][] {
  const raw = text.replace(/^\uFEFF/, '')
  if (!raw.trim()) return []

  const firstLine = raw.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const sep = delimiter ?? detectDelimiter(firstLine)

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (inQuotes) {
      if (c === '"') {
        if (raw[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === sep) {
      row.push(field)
      field = ''
    } else if (c === '\n' || (c === '\r' && raw[i + 1] === '\n')) {
      if (c === '\r') i++
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }

  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)

  return rows
}

export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return parseDelimitedText(await file.text())
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return []
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return []
    const grid = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })
    return grid.map((line) =>
      line.map((cell) => (cell == null ? '' : String(cell).trim()))
    )
  }
  throw new Error('Use arquivo .csv, .xlsx ou .xls.')
}

function parseNumber(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return NaN
  const normalized = trimmed
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  return Number(normalized)
}

function rowToRecord(headers: string[], cells: string[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (let i = 0; i < headers.length; i++) {
    const key = normalizeHeader(headers[i] ?? '')
    if (!key) continue
    record[key] = (cells[i] ?? '').trim()
  }
  return record
}

function recordToProductInput(record: Record<string, string>): ProductInput {
  const input: ProductInput = {
    code: '',
    description: '',
    stock: 0,
    price: 0,
  }

  for (const [header, field] of Object.entries(HEADER_ALIASES)) {
    const value = record[header]
    if (value === undefined) continue
    if (field === 'code' || field === 'description') {
      input[field] = value
    } else if (field === 'stock') {
      input.stock = parseNumber(value)
    } else if (field === 'price') {
      input.price = parseNumber(value)
    }
  }

  return input
}

export function parseImportGrid(grid: string[][]): ParseImportResult {
  if (!grid.length) {
    return { rows: [], valid: [], errors: [] }
  }

  const headerRow = grid[0] ?? []
  const dataRows = grid.slice(1)
  const headers = headerRow.map((h) => normalizeHeader(String(h ?? '')))
  const hasKnownHeader = headers.some((h) => h in HEADER_ALIASES)

  const rows: ParsedImportRow[] = []
  const valid: ProductInput[] = []

  const body = hasKnownHeader
    ? dataRows
    : grid /* sem cabeçalho: codigo, descricao, estoque, preco */

  const startLine = hasKnownHeader ? 2 : 1

  for (let i = 0; i < body.length; i++) {
    const line = body[i] ?? []
    const cells = line.map((c) => String(c ?? '').trim())
    if (cells.every((c) => !c)) continue

    const lineNumber = startLine + i
    let input: ProductInput

    if (hasKnownHeader) {
      const record = rowToRecord(headers, cells)
      input = recordToProductInput(record)
    } else {
      input = {
        code: cells[0] ?? '',
        description: cells[1] ?? '',
        stock: parseNumber(cells[2] ?? ''),
        price: parseNumber(cells[3] ?? ''),
      }
    }

    const validated = validateProductInput(input)
    if (!validated.ok) {
      const preview: Record<string, string> = {
        codigo: input.code,
        descricao: input.description,
        estoque: String(input.stock),
        preco: String(input.price),
      }
      rows.push({ lineNumber, ok: false, error: validated.error, preview })
      continue
    }

    rows.push({ lineNumber, ok: true, data: validated.data })
    valid.push(validated.data)
  }

  if (valid.length > MAX_IMPORT_ROWS) {
    throw new Error(`Máximo de ${MAX_IMPORT_ROWS} produtos por importação.`)
  }

  return {
    rows,
    valid,
    errors: rows.filter((r): r is Extract<ParsedImportRow, { ok: false }> => !r.ok),
  }
}

export function downloadImportTemplate() {
  const blob = new Blob([`\uFEFF${IMPORT_TEMPLATE_CSV}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-produtos.csv'
  a.click()
  URL.revokeObjectURL(url)
}
