import { execFileSync } from "node:child_process";

// Vercel не запускает Docker entrypoint: подготовка БД выполняется до сборки.
const run = (script) => execFileSync("npm", ["run", script], { stdio: "inherit" });

run("db:migrate:all");

// Публичные аккаунты создаются только на явно настроенном демо-стенде.
// seed:demo проверяет изоляцию и метку схемы; готовую демо-базу пропускает.
if (process.env.DEMO_SEED === "1") {
  run("demo:logins");
  run("seed:demo");
}

run("build");
