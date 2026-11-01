"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = sendOTP;
async function sendOTP(phone, code) {
    const apitxtKey = (process.env.APITXT_AUTH_KEY || "LfoDh9dYrJrDmuLt2KXMkCe12gd8MzAqoUOhjJ4laMg").trim();
    const preferredChannel = (process.env.OTP_CHANNEL || "whatsapp").trim().toLowerCase(); // "whatsapp" (default) or "sms"
    // Sanitize phone number (extract digits only)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
        cleanPhone = cleanPhone.slice(2);
    }
    if (!apitxtKey || apitxtKey.includes("placeholder") || apitxtKey.length < 10) {
        return { success: false, message: "APITXT_AUTH_KEY is not configured." };
    }
    // 1. Dispatch through preferred channel
    const primaryResult = await callApitxt(apitxtKey, cleanPhone, code, preferredChannel);
    if (primaryResult.success) {
        return primaryResult;
    }
    // 2. If WhatsApp failed, automatically fallback to SMS
    if (preferredChannel === "whatsapp") {
        console.warn(`[OTP] WhatsApp delivery failed for ${cleanPhone}. Falling back to SMS...`);
        const fallbackResult = await callApitxt(apitxtKey, cleanPhone, code, "sms");
        if (fallbackResult.success) {
            console.log(`[OTP] Fallback SMS succeeded for ${cleanPhone}`);
            return fallbackResult;
        }
    }
    return primaryResult;
}
async function callApitxt(authkey, cleanPhone, code, channel) {
    try {
        const queryParams = new URLSearchParams({
            authkey,
            mobile: cleanPhone,
            otp: code,
            channel: channel === "whatsapp" ? "whatsapp" : "sms"
        });
        if (channel === "whatsapp") {
            queryParams.set("country", "91");
        }
        const response = await fetch(`https://apitxt.com/api/sendOTP?${queryParams.toString()}`, {
            method: "GET"
        });
        const data = await response.json();
        if (data && (data.status === "success" || data.code === 200 || data.type === "success")) {
            console.log(`[OTP] Successfully dispatched ${channel.toUpperCase()} OTP to ${cleanPhone} via APITxT (RequestId: ${data.data?.request_id || "N/A"})`);
            return { success: true, message: "OTP sent successfully.", response: data };
        }
        else {
            const errorMsg = data.message || JSON.stringify(data);
            console.error(`[OTP] APITxT ${channel.toUpperCase()} error for ${cleanPhone}:`, errorMsg);
            return { success: false, message: errorMsg, response: data };
        }
    }
    catch (error) {
        console.error(`[OTP] Exception calling APITxT ${channel.toUpperCase()} for ${cleanPhone}:`, error);
        return { success: false, message: error.message || "Network error contacting APITxT." };
    }
}
//# sourceMappingURL=sms.js.map