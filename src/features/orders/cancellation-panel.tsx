"use client";
import { Ban, Undo2 } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";

export type CancellationProposal = { proposedBySide: "CUSTOMER" | "CARRIER"; reason: string; proposedBy: string };

const SIDE_LABEL = { CUSTOMER: "Заказчик", CARRIER: "Перевозчик" } as const;

/** Кнопка «Предложить отмену по соглашению» (BL-01): после подписания договора и до начала погрузки. */
export function ProposeCancellation({ orderId }: { orderId: string }) {
  const { run } = useAction();
  return (
    <ConfirmDialog
      title="Предложить отмену по соглашению сторон?"
      description="Вторая сторона получит уведомление. Перевозка будет отменена, только если она согласится; до этого всё остаётся в силе."
      withReason
      reasonRequired
      reasonLabel="Причина отмены"
      confirmLabel="Отправить предложение"
      pendingLabel="Отправляем..."
      onConfirm={async (reason) =>
        (await run((key) => api(`/api/orders/${orderId}/cancellation`, { body: { reason }, idempotencyKey: key }), {
          success: "Предложение отмены отправлено",
        })) !== undefined
      }
      trigger={
        <Button variant="ghost" className="text-danger" data-testid="propose-cancellation">
          <Ban /> Предложить отмену
        </Button>
      }
    />
  );
}

/** Действующее предложение отмены: своё — можно отозвать, чужое — согласиться (с паролем) или отклонить. */
export function CancellationRequestPanel({
  orderId,
  proposal,
  mySide,
}: {
  orderId: string;
  proposal: CancellationProposal;
  mySide: "CUSTOMER" | "CARRIER";
}) {
  const { run, pending } = useAction();
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const mine = proposal.proposedBySide === mySide;

  if (mine) {
    return (
      <div className="bg-warning-bg border-warning-border w-full space-y-2 rounded-lg border p-3" data-testid="cancellation-request">
        <p className="text-body">
          Вы предложили отменить перевозку по соглашению сторон. Причина: <span className="font-medium">{proposal.reason}</span>. Ожидаем
          ответа второй стороны — до этого перевозка продолжается.
        </p>
        <Button
          variant="secondary"
          loading={pending}
          onClick={() =>
            run((key) => api(`/api/orders/${orderId}/cancellation/withdraw`, { method: "POST", idempotencyKey: key }), {
              success: "Предложение отозвано",
            })
          }
        >
          <Undo2 /> Отозвать предложение
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-warning-bg border-warning-border w-full space-y-3 rounded-lg border p-3" data-testid="cancellation-request">
      <p className="text-body">
        <span className="font-semibold">{SIDE_LABEL[proposal.proposedBySide]}</span> ({proposal.proposedBy}) предлагает отменить перевозку
        по соглашению сторон. Причина: <span className="font-medium">{proposal.reason}</span>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Согласиться на отмену
        </Button>
        <ConfirmDialog
          title="Отклонить предложение отмены?"
          description="Перевозка продолжится по договору."
          withReason
          reasonLabel="Комментарий для второй стороны"
          confirmLabel="Отклонить"
          onConfirm={async (comment) =>
            (await run(
              (key) => api(`/api/orders/${orderId}/cancellation/respond`, { body: { decision: "REJECT", comment }, idempotencyKey: key }),
              { success: "Предложение отклонено" },
            )) !== undefined
          }
          trigger={<Button variant="secondary">Отклонить</Button>}
        />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Согласиться на отмену перевозки?</DialogTitle>
            <DialogDescription>
              Перевозка будет отменена, плановые платежи аннулированы, обеспеченная оплата вернётся заказчику через платёжного провайдера.
              Действие необратимо — подтвердите паролем.
            </DialogDescription>
          </DialogHeader>
          <Field id="cancel-password" label="Пароль" required>
            <Input
              id="cancel-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Не отменять
            </Button>
            <Button
              variant="destructive"
              loading={pending}
              loadingText="Отменяем..."
              disabled={!password}
              onClick={() =>
                run(
                  (key) =>
                    api(`/api/orders/${orderId}/cancellation/respond`, { body: { decision: "ACCEPT", password }, idempotencyKey: key }),
                  { success: "Перевозка отменена по соглашению сторон", onSuccess: () => setOpen(false) },
                )
              }
            >
              Отменить перевозку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
