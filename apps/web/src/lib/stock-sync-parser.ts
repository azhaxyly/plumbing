import * as XLSX from "xlsx";

export interface StockRow {
  article: string;
  brand: string;
  quantity: number | null; // null = "20 и более"
}

function parseQuantity(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("более")) return null;
  // Russian decimal format: "17,000" = 17, "2,000" = 2
  const left = trimmed.split(",")[0]!.replace(/\s/g, "");
  const n = parseInt(left, 10);
  return isNaN(n) ? null : Math.max(0, n);
}

function rowsFromSheet(sheet: XLSX.WorkSheet): StockRow[] {
  // sheet_to_json with header:1 gives raw 2D array
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

  // Find the header row: contains "Артикул" in column index 1
  let headerIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    if (String(raw[i]?.[1] ?? "").trim() === "Артикул") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Не найдена строка заголовка с "Артикул"');

  const results: StockRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i]!;
    const article = String(row[1] ?? "").trim();
    const brand = String(row[5] ?? "").trim();
    const qtyRaw = String(row[6] ?? "").trim();
    // Skip category/group rows: must have both article and brand,
    // and article must contain at least one Latin letter or digit (real vendor code)
    if (!article || !brand) continue;
    if (!/[A-Za-z0-9]/.test(article)) continue;
    results.push({ article, brand, quantity: parseQuantity(qtyRaw) });
  }
  return results;
}

export function parseStockFile(buffer: Buffer, fileName: string): StockRow[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    // Parse CSV via xlsx so we reuse the same logic
    const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    return rowsFromSheet(sheet);
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".ods")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    return rowsFromSheet(sheet);
  }

  throw new Error("Неподдерживаемый формат файла. Используйте .xlsx или .csv");
}