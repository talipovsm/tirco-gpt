import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { acceptBid, createBid } from "@/server/services/bid.service";
import { createLoad, getLoadDetail, listLoads } from "@/server/services/load.service";
import { loadListQuerySchema } from "@/lib/validation/load";
import { actorFor, loadInput, makeCompany, makeUser, resetDb, scene } from "./helpers";

type Scene = Awaited<ReturnType<typeof scene>>;

const PRIVATE = {
  notes: "SECRET-OWNER-NOTE",
  clientName: "Клиент экспедитора",
};

async function privateLoad(s: Scene) {
  const base = loadInput();
  return createLoad(
    s.shipper,
    {
      ...base,
      ...PRIVATE,
      stops: base.stops.map((st, i) => (i === 0 ? { ...st, contactName: "Секретный Контакт", contactPhone: "+7 777 000 99 88" } : st)),
    },
    { publish: true },
  );
}

function leaks(detail: Awaited<ReturnType<typeof getLoadDetail>>) {
  const json = JSON.stringify(detail.load);
  return {
    notes: json.includes(PRIVATE.notes),
    clientName: json.includes(PRIVATE.clientName),
    contacts: json.includes("Секретный Контакт") || json.includes("+7 777 000 99 88"),
  };
}

describe("SEC-02: приватные поля груза", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("владелец видит всё", async () => {
    const load = await privateLoad(s);
    expect(leaks(await getLoadDetail(s.shipper, load.id))).toEqual({ notes: true, clientName: true, contacts: true });
  });

  it("перевозчик без ставки и экспедитор не видят заметки, клиента и контакты", async () => {
    const load = await privateLoad(s);
    expect(leaks(await getLoadDetail(s.carrier2, load.id))).toEqual({ notes: false, clientName: false, contacts: false });
    const fwdCo = await makeCompany("FORWARDER", "Fwd LLP");
    const fwdUser = await makeUser({ role: "FORWARDER", companyId: fwdCo.id });
    const fwd = await actorFor(fwdUser.id, fwdCo.id);
    expect(leaks(await getLoadDetail(fwd, load.id))).toEqual({ notes: false, clientName: false, contacts: false });
  });

  it("проигравший торги перевозчик не видит контакты, выбранный — видит контакты и клиента, но не заметки", async () => {
    const load = await privateLoad(s);
    const offer = { currency: "USD" as const, comment: null, readyDate: null, terms: null, validUntil: null };
    const win = await createBid(s.carrier, load.id, { ...offer, amount: 4000 });
    await createBid(s.carrier2, load.id, { ...offer, amount: 4100 });
    await acceptBid(s.shipper, win.id);
    expect(leaks(await getLoadDetail(s.carrier2, load.id))).toEqual({ notes: false, clientName: false, contacts: false });
    expect(leaks(await getLoadDetail(s.carrier, load.id))).toEqual({ notes: false, clientName: true, contacts: true });
  });

  it("биржа не отдаёт заметки и клиента", async () => {
    await privateLoad(s);
    const market = await listLoads(s.carrier2, loadListQuerySchema.parse({ scope: "marketplace" }));
    expect(market.items.length).toBe(1);
    expect(JSON.stringify(market.items)).not.toContain(PRIVATE.notes);
    expect(JSON.stringify(market.items)).not.toContain(PRIVATE.clientName);
    const mine = await listLoads(s.shipper, loadListQuerySchema.parse({ scope: "mine" }));
    expect(JSON.stringify(mine.items)).toContain(PRIVATE.notes);
    expect(await prisma.load.count()).toBe(1);
  });
});
