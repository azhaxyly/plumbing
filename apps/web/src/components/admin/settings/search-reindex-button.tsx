"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

async function callTrpc<T>(procedure: string, json: unknown): Promise<T> {
  const res = await fetch(`/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  if (!res.ok) {
    const msg = data?.error?.json?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data.result?.data?.json as T;
}

export function SearchReindexButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ enqueued: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReindex() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await callTrpc<{ enqueued: number }>("adminProducts.reindexAll", {});
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleReindex}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {loading ? "Постановка в очередь..." : "Запустить переиндексацию"}
      </button>
      {result && (
        <p className="text-sm text-green-600">
          Поставлено в очередь: <strong>{result.enqueued}</strong> товаров
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
