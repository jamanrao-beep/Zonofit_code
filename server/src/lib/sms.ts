/**
 * Utility to send OTP via APITxT (supports SMS and WhatsApp without requiring custom DLT registration).
 */
export interface SMSResult {
  success: boolean;
  message?: string;
  response?: any;
}

export async function sendOTP(phone: string, code: string): Promise<SMSResult> {
  const apitxtKey = (process.env.APITXT_AUTH_KEY || "LfoDh9dYrJrDmuLt2KXMkCe12gd8MzAqoUOhjJ4laMg").trim();

  // Sanitize phone number (extract 10 digits)
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
    cleanPhone = cleanPhone.slice(2);
  }
  if (cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(-10);
  }

  if (!apitxtKey || apitxtKey.includes("placeholder") || apitxtKey.length < 10) {
    return { success: false, message: "APITXT_AUTH_KEY is not configured." };
  }

  // 1. WhatsApp is the primary delivery channel in India because it bypasses carrier DLT filtering
  const waResult = await callApitxt(apitxtKey, cleanPhone, code, "whatsapp");
  if (waResult.success) {
    return waResult;
  }

  // 2. If WhatsApp delivery fails, fallback to standard SMS
  console.warn(`[OTP] WhatsApp delivery failed for ${cleanPhone}. Falling back to SMS...`);
  const smsResult = await callApitxt(apitxtKey, cleanPhone, code, "sms");
  if (smsResult.success) {
    return smsResult;
  }

  return waResult;
}

async function callApitxt(authkey: string, cleanPhone: string, code: string, channel: string): Promise<SMSResult> {
  try {
    const formattedMobile = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const params = new URLSearchParams({
      authkey,
      mobile: formattedMobile,
      otp: code,
      channel: channel === "whatsapp" ? "whatsapp" : "sms",
    });

    if (channel === "whatsapp") {
      params.set("country", "91");
    }

    const response = await fetch("https://apitxt.com/api/sendOTP", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.json() as any;

    if (data && (data.status === "success" || data.code === 200 || data.type === "success")) {
      console.log(`[OTP] Successfully dispatched ${channel.toUpperCase()} OTP to ${formattedMobile} via APITxT (RequestId: ${data.data?.request_id || "N/A"})`);
      return { success: true, message: "OTP sent successfully.", response: data };
    } else {
      const errorMsg = data.message || JSON.stringify(data);
      console.error(`[OTP] APITxT ${channel.toUpperCase()} error for ${formattedMobile}:`, errorMsg);
      return { success: false, message: errorMsg, response: data };
    }
  } catch (error: any) {
    console.error(`[OTP] Exception calling APITxT ${channel.toUpperCase()} for ${cleanPhone}:`, error);
    return { success: false, message: error.message || "Network error contacting APITxT." };
  }
}
