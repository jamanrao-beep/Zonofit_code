"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = sendOTP;
async function sendOTP(phone, code) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey || apiKey.includes("placeholder") || apiKey.length < 8) {
        if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true") {
            console.warn("[SMS] Dev OTP is enabled. The code was not logged.");
            return { success: true, message: "Dev OTP simulated." };
        }
        const msg = "FAST2SMS_API_KEY is not set or invalid in server environment.";
        console.error(`[SMS] ${msg}`);
        return { success: false, message: msg };
    }
    try {
        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
                "authorization": apiKey.trim(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                route: "otp",
                variables_values: code,
                numbers: phone,
            })
        });
        const data = await response.json();
        if (data.return) {
            console.log(`[SMS] Successfully sent OTP to ${phone}`);
            return { success: true, message: "Sent successfully." };
        }
        else {
            const errMsg = Array.isArray(data.message) ? data.message.join(", ") : (data.message || JSON.stringify(data));
            console.error(`[SMS] Failed to send OTP to ${phone}:`, errMsg);
            return { success: false, message: errMsg, fast2smsResponse: data };
        }
    }
    catch (error) {
        console.error(`[SMS] Exception sending OTP to ${phone}:`, error);
        return { success: false, message: error.message || "Network exception contacting Fast2SMS." };
    }
}
//# sourceMappingURL=sms.js.map