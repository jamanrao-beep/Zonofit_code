import { createHash, randomInt } from "crypto";
import tls from "tls";

const GMAIL_USER = "zonofitofficial@gmail.com";

/** Google shows the app password as 16 letters, sometimes with spaces. */
export function normalizeAppPassword(value: string | undefined): string | null {
  const compact = (value ?? "").replace(/\s/g, "");
  if (!/^[a-zA-Z]{16}$/.test(compact) || /placeholder/i.test(compact)) return null;
  return compact;
}

/** Stable otp_codes key for an email. The address itself is not stored. */
export function emailOtpKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** Email codes are 6 digits. Phone SMS codes stay at 4. */
export function createEmailCode(): string {
  return randomInt(100000, 1000000).toString();
}

function isSafeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(value);
}

type Smtp = {
  socket: tls.TLSSocket;
  write: (line: string) => void;
  next: () => Promise<string>;
};

function connectSmtp(): Promise<Smtp> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });
    const queue: string[] = [];
    let buf = "";
    let partial: string[] = [];
    let waiter: ((reply: string) => void) | null = null;

    const deliver = (reply: string) => {
      if (waiter) {
        const current = waiter;
        waiter = null;
        current(reply);
      } else {
        queue.push(reply);
      }
    };

    socket.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) continue;
        partial.push(line);
        if (/^\d{3} /.test(line)) {
          deliver(partial.join("\n"));
          partial = [];
        }
      }
    });
    socket.once("error", reject);

    socket.once("secureConnect", () => {
      resolve({
        socket,
        write(line: string) {
          socket.write(`${line}\r\n`);
        },
        next() {
          const queued = queue.shift();
          if (queued) return Promise.resolve(queued);
          return new Promise((res, rej) => {
            const timer = setTimeout(() => rej(new Error("SMTP timeout")), 15000);
            waiter = (reply: string) => {
              clearTimeout(timer);
              res(reply);
            };
          });
        },
      });
    });
  });
}

async function expectCode(smtp: Smtp, line: string | null, code: string): Promise<void> {
  if (line !== null) smtp.write(line);
  const reply = await smtp.next();
  const last = reply.split("\n").pop() ?? "";
  if (!last.startsWith(code)) throw new Error("SMTP rejected the message");
}

async function sendThroughGmail(to: string, code: string, password: string): Promise<void> {
  const from = process.env.GMAIL_USER?.trim() || GMAIL_USER;
  if (!isSafeEmail(from) || !isSafeEmail(to)) throw new Error("Invalid email address");

  const smtp = await connectSmtp();
  try {
    await expectCode(smtp, null, "220");
    await expectCode(smtp, "EHLO zonofit.com", "250");
    await expectCode(smtp, "AUTH LOGIN", "334");
    await expectCode(smtp, Buffer.from(from).toString("base64"), "334");
    await expectCode(smtp, Buffer.from(password).toString("base64"), "235");
    await expectCode(smtp, `MAIL FROM:<${from}>`, "250");
    await expectCode(smtp, `RCPT TO:<${to}>`, "250");
    await expectCode(smtp, "DATA", "354");
    const message = `${verificationMessage(from, to, code)}\r\n.`;
    await expectCode(smtp, message, "250");
    smtp.write("QUIT");
  } finally {
    smtp.socket.end();
  }
}

function verificationMessage(from: string, to: string, code: string): string {
  const digits = code.replace(/\D/g, "");
  const boundary = "zonofit-mail-boundary";
  const plain = [
    "ZonoFit",
    "",
    "Your verification code",
    "",
    "Hello,",
    "",
    "A verification code was requested for your ZonoFit account.",
    "Enter this code on the screen where it was requested:",
    "",
    digits,
    "",
    "This code expires in 10 minutes and can be used once.",
    "",
    "If you did not request it, you can ignore this email.",
    "ZonoFit will never ask you to share this code.",
    "",
    "ZonoFit",
    "Fitness access across partner gyms",
    "https://zonofit.com",
  ].join("\r\n");

  const cells = digits
    .split("")
    .map(
      (digit, index) =>
        `<td style="width:42px;height:52px;background-color:#F4F7F2;border:1px solid #E4EAE1;border-radius:10px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:52px;font-weight:700;color:#0F2417;">${digit}</td>${
          index === digits.length - 1 ? "" : `<td style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`
        }`
    )
    .join("");

  const html = [
    "<!DOCTYPE html>",
    `<html lang="en"><body style="margin:0;padding:0;background-color:#F4F7F2;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F2;padding:32px 16px;">`,
    `<tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #E4EAE1;border-radius:16px;">`,
    `<tr><td style="background-color:#1F7A3F;padding:28px 32px;">`,
    `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:30px;font-weight:700;color:#ffffff;">ZonoFit</p>`,
    `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;letter-spacing:0.4px;color:#E8F4EA;">Account verification</p>`,
    `</td></tr>`,
    `<tr><td style="padding:32px 32px 8px;">`,
    `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#0F2417;">Hello,</p>`,
    `<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#3D4F44;">A verification code was requested for your ZonoFit account. Enter the code below to continue. It expires in <strong>10 minutes</strong> and can be used once.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 28px;"><tr>${cells}</tr></table>`,
    `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#3D4F44;">Use this code on the ZonoFit screen where it was requested.</p>`,
    `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#66756B;">If you did not request this code, you can ignore this email. No change will be made to your account.</p>`,
    `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#66756B;"><strong style="color:#0F2417;">ZonoFit will never ask you to share this code.</strong></p>`,
    `</td></tr>`,
    `<tr><td style="padding:20px 32px 28px;">`,
    `<p style="margin:0;padding-top:18px;border-top:1px solid #E4EAE1;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#66756B;"><strong style="color:#0F2417;">ZonoFit</strong><br>Fitness access across partner gyms<br><a href="https://zonofit.com" style="color:#1F7A3F;text-decoration:none;">zonofit.com</a></p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr></table>`,
    `</body></html>`,
  ].join("\r\n");

  const stamp = createHash("sha256").update(`${to}:${Date.now()}`).digest("hex").slice(0, 24);
  return [
    `From: ZonoFit <${from}>`,
    `To: ${to}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${stamp}@zonofit.com>`,
    "Subject: Your ZonoFit verification code",
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

/** Emails a one-time code from the ZonoFit Gmail account. Never logs the code. */
export async function sendEmailOTP(to: string, code: string): Promise<boolean> {
  const password = normalizeAppPassword(process.env.GMAIL_APP_PASSWORD);
  if (!password) {
    if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true") {
      console.warn("[Mail] Dev OTP is enabled. The code was not logged.");
      return true;
    }
    console.error("[Mail] Refusing to pretend an OTP was sent. Set GMAIL_APP_PASSWORD.");
    return false;
  }

  try {
    await sendThroughGmail(to, code, password);
    console.log("[Mail] Verification code sent.");
    return true;
  } catch (err: unknown) {
    console.error("[Mail] Could not send the verification code.", err instanceof Error ? err.message : "SMTP error");
    return false;
  }
}
