import { z } from "zod";
import { BODY_TYPES, CARGO_TYPES, VEHICLE_TYPES } from "@/lib/validation/load";
import { defaultWizardValues, type WizardValues } from "./wizard-values";

export type LoadDraftScope = { userId: string; companyId: string; dataMode: "real" | "demo" };
export const LOAD_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DRAFT_LENGTH = 100_000;
const text = z.string().max(5_000);
const time = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]);
const date = z.string().refine((v) => {
  if (!v) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const parsed = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
});

// The recovery copy may be incomplete, but its types and dates must be safe to render.
const valuesSchema: z.ZodType<WizardValues> = z.object({
  stops: z
    .array(
      z.object({
        type: z.enum(["PICKUP", "BORDER", "DELIVERY", "TRANSIT"]),
        country: z.string().regex(/^[A-Z]{2}$/),
        city: text,
        street: text,
        building: text,
        fullAddress: text,
        date,
        timeFrom: time,
        timeTo: time,
        contactName: text,
        contactPhone: text,
        notes: text,
      }),
    )
    .min(2)
    .max(12),
  title: text,
  clientName: text,
  cargoType: z.enum(CARGO_TYPES),
  cargoDescription: text,
  weightKg: text,
  volumeM3: text,
  packagesCount: text,
  packageType: text,
  vehicleType: z.union([z.enum(VEHICLE_TYPES), z.literal("")]),
  bodyType: z.union([z.enum(BODY_TYPES), z.literal("")]),
  temperatureFrom: text,
  temperatureTo: text,
  requiresGps: z.boolean(),
  requirements: text,
  priceType: z.enum(["FIXED", "NEGOTIABLE", "REQUEST_QUOTE"]),
  targetPrice: text,
  currency: z.enum(["USD", "CNY", "KZT", "RUB"]),
  additionalTerms: text,
  notes: text,
  visibility: z.enum(["MARKETPLACE", "INVITE_ONLY"]),
  invitedCarrierIds: z.array(z.uuid()).max(50),
});

const draftSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number().finite(),
  step: z.number().int().min(0).max(3),
  idempotencyKey: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9-]+$/),
  values: valuesSchema,
});
export type LocalLoadDraft = z.infer<typeof draftSchema>;

export function localLoadDraftKey(scope: LoadDraftScope): string {
  return `tirco:load-form:v1:${JSON.stringify([scope.dataMode, scope.userId, scope.companyId])}`;
}

export function parseLocalLoadDraft(raw: string | null, now = Date.now()): LocalLoadDraft | null {
  if (!raw || raw.length > MAX_DRAFT_LENGTH) return null;
  try {
    const result = draftSchema.safeParse(JSON.parse(raw));
    if (!result.success) return null;
    const age = now - result.data.updatedAt;
    return age >= -60_000 && age < LOAD_DRAFT_TTL_MS ? result.data : null;
  } catch {
    return null;
  }
}

export function hasLoadDraftChanges(values: WizardValues): boolean {
  return JSON.stringify(values) !== JSON.stringify(defaultWizardValues);
}
