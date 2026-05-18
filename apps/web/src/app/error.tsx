"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">Что-то пошло не так</h1>
      <p className="text-muted-foreground">
        Произошла непредвиденная ошибка. Попробуйте ещё раз.
      </p>
      {error.digest != null && (
        <p className="text-xs text-muted-foreground">
          Код ошибки: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Попробовать снова
      </button>
    </div>
  );
}
