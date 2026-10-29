"use client";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabDef = { value: string; label: React.ReactNode; content: React.ReactNode; hidden?: boolean };

/** Вкладки, синхронизированные с ?tab= (ссылки из уведомлений ведут на нужную вкладку). */
export function UrlTabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const visible = tabs.filter((t) => !t.hidden);
  const requested = params.get("tab");
  const fallback = visible.some((t) => t.value === defaultTab) ? defaultTab : visible[0]?.value;
  const value = visible.some((t) => t.value === requested) ? requested! : fallback;
  return (
    <Tabs
      value={value}
      activationMode="manual"
      onValueChange={(v) => {
        // Radix может запросить выбор и при нажатии, и при восстановлении фокуса.
        // Одно действие должно создавать только одну запись в истории.
        if (new URLSearchParams(window.location.search).get("tab") === v) return;
        const sp = new URLSearchParams(params.toString());
        sp.set("tab", v);
        // Всё содержимое вкладок уже передано сервером: не загружаем карточку заново.
        window.history.pushState(null, "", `${pathname}?${sp.toString()}`);
      }}
    >
      <TabsList className="h-auto flex-wrap gap-x-4 gap-y-0 overflow-visible">
        {visible.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="min-h-12">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {visible.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
