"use client";

import { Button, Input } from "@timsan/ui";
import { CheckCircle, FileUp, Loader2, XCircle } from "lucide-react";
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
  matchSource: "sku" | "name" | "not_found";
  products: MatchedProduct[];
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StockSyncPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileBase64, setFileBase64] = useState<string>("");
  const [quantityForMore, setQuantityForMore] = useState(20);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [applyResult, setApplyResult] = useState<{ updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, startPreview] = useTransition();
  const [isApplying, startApply] = useTransition();

  function loadFile(file: File) {
    setFileName(file.name);
    setPreview(null);
    setApplyResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const ab = e.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(ab);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
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
    startPreview(async () => {
      try {
        const rows = await callTrpc<PreviewRow[]>("adminProducts.previewStockSync", {
          fileBase64,
          fileName,
          quantityForMore,
        });
        setPreview(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при загрузке");
      }
    });
  }

  function handleApply() {
    if (!preview) return;
    const matched = preview.filter((r) => r.matchSource !== "not_found" && r.products.length > 0);
    startApply(async () => {
      try {
        const result = await callTrpc<{ updated: number; skipped: number }>(
          "adminProducts.applyStockSync",
          {
            rows: matched.map((r) => ({
              article: r.article,
              quantity: r.quantity,
            })),
          },
        );
        setApplyResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при синхронизации");
      }
    });
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const foundBySku = preview?.filter((r) => r.matchSource === "sku").length ?? 0;
  const foundByName = preview?.filter((r) => r.matchSource === "name").length ?? 0;
  const notFound = preview?.filter((r) => r.matchSource === "not_found").length ?? 0;
  const matchedRows = preview?.filter((r) => r.matchSource !== "not_found") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Синхронизация остатков</h1>

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
          Обновлено вариантов: <strong>{applyResult.updated}</strong> | Пропущено: {applyResult.skipped}
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
                  <th className="px-4 py-3">Товар в БД</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {matchedRows.map((row, i) => (
                  <tr key={`${row.article}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.article}</td>
                    <td className="px-4 py-2 text-gray-600">{row.brand}</td>
                    <td className="px-4 py-2 font-medium">{row.quantity}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}