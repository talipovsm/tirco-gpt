import { formatDateTime, formatRelative } from "@/lib/format";

type PositionStamp = { source?: "tracking" | "estimated"; at?: string | null } | null;

/** Не выдаём оценку маршрута или отметку с неверным временем за актуальную GPS-позицию. */
export function describePosition(position: PositionStamp, now: Date = new Date()) {
  if (!position) {
    return { source: "missing", label: "Нет координат", description: "Местоположение ещё не получено." } as const;
  }
  if (position.source === "estimated") {
    return {
      source: "estimated",
      label: "Примерная позиция",
      description: "Оценка по маршруту, а не отметка GPS.",
    } as const;
  }
  if (position.source !== "tracking") {
    return { source: "unknown", label: "Координаты", description: "Источник и время позиции неизвестны." } as const;
  }
  const recordedAt = position.at ? new Date(position.at) : null;
  if (!recordedAt || !Number.isFinite(recordedAt.getTime()) || !Number.isFinite(now.getTime())) {
    return { source: "tracking", label: "GPS · время неизвестно", description: "У отметки GPS нет подтверждённого времени." } as const;
  }
  if (recordedAt > now) {
    return {
      source: "tracking",
      label: "GPS · проверьте время",
      description: `Время отметки GPS впереди текущего: ${formatDateTime(recordedAt)}.`,
    } as const;
  }
  return {
    source: "tracking",
    label: `GPS · ${formatRelative(recordedAt, now)}`,
    description: `Отметка GPS: ${formatDateTime(recordedAt)}.`,
  } as const;
}
