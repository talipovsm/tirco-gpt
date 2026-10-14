import type { Metadata } from "next";
import { connection } from "next/server";
import { ForgotPasswordForm, type ResetDelivery } from "@/features/auth/password-forms";
import { emailDeliveryEnabled } from "@/lib/notifications/email";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default async function Page() {
  // Способ доставки зависит от переменных окружения сервера, а не сборки
  await connection();
  const delivery: ResetDelivery = emailDeliveryEnabled() ? "email" : process.env.NODE_ENV === "production" ? "unavailable" : "log";
  return <ForgotPasswordForm delivery={delivery} />;
}
