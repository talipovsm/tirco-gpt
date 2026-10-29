import { isForwarderRole } from "@/lib/permissions";
import type { Metadata } from "next";
import { PageHeader } from "@/components/common/misc";
import { LoadWizard } from "@/features/loads/load-wizard";
import { pageActorWith } from "@/server/page-context";
import { listCarrierOptions } from "@/server/services/load.service";

export const metadata: Metadata = { title: "Создать груз" };

export default async function NewLoadPage() {
  const actor = await pageActorWith("LOAD_CREATE");
  const carriers = await listCarrierOptions();
  const draftScope = { userId: actor.userId, companyId: actor.active?.companyId ?? "none", dataMode: actor.dataMode };
  return (
    <>
      <PageHeader
        title="Создать груз"
        description="Заполните 4 шага — перевозчики увидят груз на бирже и предложат цену."
        back={{ href: "/loads", label: "Мои грузы" }}
      />
      <LoadWizard
        key={JSON.stringify(draftScope)}
        mode="create"
        draftScope={draftScope}
        carriers={carriers}
        isForwarder={isForwarderRole(actor.active?.role)}
      />
    </>
  );
}
