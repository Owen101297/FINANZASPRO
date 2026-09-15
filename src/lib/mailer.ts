import nodemailer from "nodemailer";
import fs from "node:fs";

const RESET_LOG_PATH = "/tmp/reset-mail.log";

export interface MailResult {
  channel: "smtp" | "log";
}

/**
 * SMTP genérico si está configurado (SMTP_HOST/PORT/USER/PASS + MAIL_FROM).
 * Sin credenciales (dev/CI/piloto) el enlace se imprime en los logs del
 * servidor y se vuelca a /tmp/reset-mail.log para poder probar el flujo.
 */
function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM?.trim();
  if (!host || !user || !pass || !from) return null;
  return {
    host,
    user,
    pass,
    from,
    port: Number(process.env.SMTP_PORT ?? 587),
  };
}

export async function sendPasswordResetMail(to: string, resetUrl: string): Promise<MailResult> {
  const subject = "Recupera tu contraseña — FinanzasPro";
  const text = [
    "Has solicitado restablecer la contraseña de tu cuenta de FinanzasPro.",
    "",
    resetUrl,
    "",
    "Si no fuiste tú, ignora este mensaje. El enlace expira en 60 minutos.",
  ].join("\n");

  const cfg = smtpConfig();
  if (!cfg) {
    const line = `PASSWORD_RESET ${to} ${resetUrl}`;
    console.log(`[mailer:log] ${line}`);
    try {
      fs.appendFileSync(RESET_LOG_PATH, `${new Date().toISOString()} ${line}\n`);
    } catch {
      /* volumen efímero no disponible: no debe romper el flujo */
    }
    return { channel: "log" };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transporter.sendMail({ from: cfg.from, to, subject, text });
  return { channel: "smtp" };
}