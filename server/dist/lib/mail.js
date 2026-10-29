"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAppPassword = normalizeAppPassword;
exports.emailOtpKey = emailOtpKey;
exports.sendEmailOTP = sendEmailOTP;
const crypto_1 = require("crypto");
const tls_1 = __importDefault(require("tls"));
const GMAIL_USER = "zonofitofficial@gmail.com";
/** Google shows the app password as 16 letters, sometimes with spaces. */
function normalizeAppPassword(value) {
    const compact = (value ?? "").replace(/\s/g, "");
    if (!/^[a-zA-Z]{16}$/.test(compact) || /placeholder/i.test(compact))
        return null;
    return compact;
}
/** Stable otp_codes key for an email. The address itself is not stored. */
function emailOtpKey(email) {
    return (0, crypto_1.createHash)("sha256").update(email.trim().toLowerCase()).digest("hex");
}
function isSafeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(value);
}
function connectSmtp() {
    return new Promise((resolve, reject) => {
        const socket = tls_1.default.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });
        const queue = [];
        let buf = "";
        let partial = [];
        let waiter = null;
        const deliver = (reply) => {
            if (waiter) {
                const current = waiter;
                waiter = null;
                current(reply);
            }
            else {
                queue.push(reply);
            }
        };
        socket.on("data", (chunk) => {
            buf += chunk.toString("utf8");
            const lines = buf.split(/\r?\n/);
            buf = lines.pop() ?? "";
            for (const line of lines) {
                if (!line)
                    continue;
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
                write(line) {
                    socket.write(`${line}\r\n`);
                },
                next() {
                    const queued = queue.shift();
                    if (queued)
                        return Promise.resolve(queued);
                    return new Promise((res, rej) => {
                        const timer = setTimeout(() => rej(new Error("SMTP timeout")), 15000);
                        waiter = (reply) => {
                            clearTimeout(timer);
                            res(reply);
                        };
                    });
                },
            });
        });
    });
}
async function expectCode(smtp, line, code) {
    if (line !== null)
        smtp.write(line);
    const reply = await smtp.next();
    const last = reply.split("\n").pop() ?? "";
    if (!last.startsWith(code))
        throw new Error("SMTP rejected the message");
}
async function sendThroughGmail(to, code, password) {
    const from = process.env.GMAIL_USER?.trim() || GMAIL_USER;
    if (!isSafeEmail(from) || !isSafeEmail(to))
        throw new Error("Invalid email address");
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
        const message = [
            `From: ZonoFit <${from}>`,
            `To: ${to}`,
            "Subject: Your ZonoFit verification code",
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=utf-8",
            "",
            `Your ZonoFit verification code is ${code}.`,
            "It expires in 10 minutes.",
            "If you did not try to sign in, you can ignore this email.",
            ".",
        ].join("\r\n");
        await expectCode(smtp, message, "250");
        smtp.write("QUIT");
    }
    finally {
        smtp.socket.end();
    }
}
/** Emails a one-time code from the ZonoFit Gmail account. Never logs the code. */
async function sendEmailOTP(to, code) {
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
    }
    catch (err) {
        console.error("[Mail] Could not send the verification code.", err instanceof Error ? err.message : "SMTP error");
        return false;
    }
}
//# sourceMappingURL=mail.js.map