import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { verifiedReason } from "@/lib/auth/forbidden-link";

export const metadata: Metadata = { title: "Нет доступа" };

const DEFAULT_REASON = "У вас нет доступа к этой странице.";

/** Причина показывается, только если ссылку подписал сервер (SEC-08) — иначе страницу можно использовать для фишинга. */
export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ reason?: string; sig?: string }> }) {
  const { reason, sig } = await searchParams;
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <ShieldX className="text-muted-foreground mx-auto size-12 [stroke-width:1.5]" aria-hidden />
        <h1 className="text-title2 mt-3">Нет доступа</h1>
        <p className="text-subheadline text-muted-foreground mt-1.5">{verifiedReason(reason, sig) ?? DEFAULT_REASON}</p>
        <Button asChild className="mt-6">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
