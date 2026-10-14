"use client";
import { useEffect } from "react";
import "./globals.css";

/**
 * Ошибка корневого layout (UX-08): заменяет весь документ, поэтому задаёт свои html/body и подключает глобальные стили.
 * Без зависимостей от компонентов приложения — они могли стать причиной ошибки.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ui.root_error", { digest: error.digest });
  }, [error]);
  return (
    <html lang="ru">
      <body className="bg-background text-foreground">
        <title>Ошибка — Tirco</title>
        <main className="grid min-h-dvh place-items-center px-4">
          <div role="alert" className="max-w-md text-center">
            <h1 className="text-title2">Что-то пошло не так</h1>
            <p className="text-subheadline text-muted-foreground mt-1.5">
              Не удалось открыть Tirco. Обновите страницу — если ошибка повторится, обратитесь в поддержку.
            </p>
            {error.digest && <p className="text-footnote text-muted-foreground id-code mt-1">Код: {error.digest}</p>}
            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="bg-primary text-primary-foreground text-body h-9 rounded-sm px-4 font-medium"
              >
                Повторить
              </button>
              <a href="/" className="bg-fill-tertiary text-body inline-flex h-9 items-center rounded-sm px-4 font-medium">
                На главную
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
