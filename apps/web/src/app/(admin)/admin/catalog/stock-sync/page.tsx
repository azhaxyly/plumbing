"use client";

import { Button, Input } from "@timsan/ui";
import { AlertTriangle, CheckCircle, Download, FileUp, Loader2, XCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";


// ─── Types ─────────────────────────────────────────────────────────────────────

interface MatchedProduct {
  id: string;
  name: string;
  sku: string;
}

interface PreviewRow {
  article: string;
  brand: string;
  quantity: number;
  newPriceCents: number | null;
  currentPriceCents: number | null;
  priceConflict: boolean;
  matchSource: "sku" | "name" | "not_found";
  products: MatchedProduct[];
}

interface NotInFileRow {
  id: string;
  sku: string;
  name: string;
  brand: string;
  priceCents: number;
  totalQuantity: number;
}

interface PreviewResponse {
  rows: PreviewRow[];
  notInFile: NotInFileRow[];
  excludedBrands: string[];
}

interface ApplyResult {
  updated: number;
  pricesUpdated: number;
  skipped: number;
}

// ─── tRPC helpers ──────────────────────────────────────────────────────────────

async function callTrpc<T>(procedure: string, json: unknown): Promise<T> {
  const res = await fetch(`/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  if (!res.ok) {
    const zodErrors = data?.error?.json?.data?.zodError;
    const msg = data?.error?.json?.message ?? `HTTP ${res.status}`;
    const detail = zodErrors ? JSON.stringify(zodErrors, null, 2) : null;
    console.error("[callTrpc] error:", msg, detail);
    throw new Error(detail ? `${msg}\n${detail}` : msg);
  }
  return data.result?.data?.json as T;
}

// ─── Formatting ────────────────────────────────────────────────────────────────

function formatTenge(cents: number | null): string {
  if (cents === null) return "—";
  return `${(cents / 100).toLocaleString("ru-RU")} ₸`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StockSyncPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileBase64, setFileBase64] = useState<string>("");
  const [quantityForMore, setQuantityForMore] = useState(20);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [zeroResult, setZeroResult] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, startPreview] = useTransition();
  const [isApplying, startApply] = useTransition();
  const [isZeroing, startZero] = useTransition();

  function loadFile(file: File) {
    setFileName(file.name);
    setPreview(null);
    setApplyResult(null);
    setZeroResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const ab = e.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(ab);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
      setFileBase64(btoa(binary));
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }

  function handlePreview() {
    if (!fileBase64) return;
    setError("");
    setApplyResult(null);
    setZeroResult(null);
    startPreview(async () => {
      try {
        const resp = await callTrpc<PreviewResponse>("adminProducts.previewStockSync", {
          fileBase64,
          fileName,
          quantityForMore,
        });
        setPreview(resp);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при загрузке");
      }
    });
  }

  function handleApply() {
    if (!preview) return;
    const matched = preview.rows.filter(
      (r) => r.matchSource !== "not_found" && r.products.length > 0,
    );
    startApply(async () => {
      try {
        const result = await callTrpc<ApplyResult>("adminProducts.applyStockSync", {
          rows: matched.map((r) => ({
            article: r.article,
            quantity: r.quantity,
            priceCents: r.newPriceCents,
          })),
        });
        setApplyResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при синхронизации");
      }
    });
  }

  function handleDownloadNotInFile() {
    if (!preview) return;
    const header = "SKU;Название;Бренд;Остаток;Цена";
    const lines = preview.notInFile.map((p) =>
      [p.sku, `"${p.name.replace(/"/g, '""')}"`, p.brand, p.totalQuantity, p.priceCents / 100].join(";"),
    );
    // BOM so Excel opens the file as UTF-8
    const blob = new Blob([String.fromCharCode(0xfeff) + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "net-v-fayle.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleZeroStock() {
    if (!preview || preview.notInFile.length === 0) return;
    const ok = window.confirm(
      `Обнулить остатки у ${preview.notInFile.length} товаров, которых нет в файле?\n\n` +
        "Товары останутся на витрине со статусом «нет в наличии». " +
        "Перед этим рекомендуется скачать список и проверить его.",
    );
    if (!ok) return;
    startZero(async () => {
      try {
        const result = await callTrpc<{ variantsZeroed: number }>("adminProducts.zeroStock", {
          productIds: preview.notInFile.map((p) => p.id),
        });
        setZeroResult(result.variantsZeroed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при обнулении остатков");
      }
    });
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const rows = preview?.rows ?? [];
  const foundBySku = rows.filter((r) => r.matchSource === "sku").length;
  const foundByName = rows.filter((r) => r.matchSource === "name").length;
  const notFound = rows.filter((r) => r.matchSource === "not_found").length;
  const matchedRows = rows.filter((r) => r.matchSource !== "not_found");
  const priceChanges = matchedRows.filter(
    (r) =>
      r.newPriceCents !== null &&
      r.currentPriceCents !== null &&
      r.newPriceCents !== r.currentPriceCents,
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Синхронизация остатков и цен</h1>

      {/* ── Upload card ── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-medium text-gray-700">Загрузить файл</h2>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <FileUp className="h-8 w-8 text-gray-400" />
          <span className="text-sm text-gray-500">
            {fileName ? fileName : "Перетащите файл или нажмите для выбора (.xlsx, .csv)"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.ods"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Quantity for "20 и более" */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            Кол-во для «20 и более»:
          </label>
          <Input
            type="number"
            min={1}
            value={quantityForMore}
            onChange={(e) => setQuantityForMore(parseInt(e.target.value, 10) || 20)}
            className="w-24"
          />
        </div>

        <Button
          onClick={handlePreview}
          disabled={!fileBase64 || isPreviewing}
        >
          {isPreviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Загрузить и проверить
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Apply result ── */}
      {applyResult && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Обновлено остатков: <strong>{applyResult.updated}</strong> | Обновлено цен:{" "}
          <strong>{applyResult.pricesUpdated}</strong> | Пропущено: {applyResult.skipped}
        </div>
      )}

      {/* ── Zero-stock result ── */}
      {zeroResult !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Обнулены остатки у <strong>{zeroResult}</strong> вариантов товаров.
        </div>
      )}

      {/* ── Preview ── */}
      {preview && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
              По SKU: {foundBySku}
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
              По названию: {foundByName}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
              Изменения цен: {priceChanges}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
              Не найдено: {notFound}
            </span>
          </div>

          {/* Apply button */}
          {matchedRows.length > 0 && (
            <Button
              onClick={handleApply}
              disabled={isApplying}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Применить синхронизацию ({matchedRows.length} товаров)
            </Button>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Артикул</th>
                  <th className="px-4 py-3">Бренд</th>
                  <th className="px-4 py-3">Кол-во</th>
                  <th className="px-4 py-3">Цена сейчас</th>
                  <th className="px-4 py-3">Цена новая</th>
                  <th className="px-4 py-3">Товар в БД</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {matchedRows.map((row, i) => {
                  const priceChanged =
                    row.newPriceCents !== null &&
                    row.currentPriceCents !== null &&
                    row.newPriceCents !== row.currentPriceCents;
                  const priceUp =
                    priceChanged && (row.newPriceCents ?? 0) > (row.currentPriceCents ?? 0);
                  return (
                    <tr key={`${row.article}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">
                        {row.article}
                        {row.priceConflict && (
                          <span
                            className="ml-1 inline-flex items-center text-amber-500"
                            title="В файле несколько строк с этим артикулом и разными ценами"
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{row.brand}</td>
                      <td className="px-4 py-2 font-medium">{row.quantity}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {formatTenge(row.currentPriceCents)}
                      </td>
                      <td
                        className={`px-4 py-2 font-medium ${
                          priceChanged
                            ? priceUp
                              ? "text-red-600"
                              : "text-green-600"
                            : "text-gray-700"
                        }`}
                      >
                        {formatTenge(row.newPriceCents)}
                        {priceChanged && (priceUp ? " ↑" : " ↓")}
                      </td>
                      <td className="px-4 py-2 text-gray-800">
                        {row.products.map((p) => (
                          <div key={p.id} className="truncate max-w-xs" title={p.name}>
                            {p.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-2">
                        {row.matchSource === "sku" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            <CheckCircle className="h-3 w-3" /> SKU
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            По названию
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Not in file ── */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Активные товары, которых нет в файле: {preview.notInFile.length}
            </h2>
            <p className="text-sm text-amber-700">
              Эти товары не нашлись в загруженном файле ни по артикулу, ни по названию.
              Возможно, их нет в наличии — либо у них в базе неверный артикул. Бренды,
              которые исключены из отчёта 1С ({preview.excludedBrands.join(", ")}), в этот
              список не попадают. Ничего не обнуляется автоматически — скачайте список,
              проверьте его и при необходимости обнулите остатки.
            </p>
            {preview.notInFile.length > 0 && (
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleDownloadNotInFile}>
                  <Download className="mr-2 h-4 w-4" />
                  Скачать CSV
                </Button>
                <Button
                  onClick={handleZeroStock}
                  disabled={isZeroing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isZeroing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Обнулить остатки у всех ({preview.notInFile.length})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
