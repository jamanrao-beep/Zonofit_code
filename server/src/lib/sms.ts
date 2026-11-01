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
  const channel = (process.env.OTP_CHANNEL || "sms").trim().toLowerCase(); // "sms" or "whatsapp"

  // Sanitize phone number (extract digits only)
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
    cleanPhone = cleanPhone.slice(2);
  }

  if (!apitxtKey || apitxtKey.includes("placeholder") || apitxtKey.length < 10) {
    return { success: false, message: "APITXT_AUTH_KEY is not configured." };
  }

  try {
    const queryParams = new URLSearchParams({
      authkey: apitxtKey,
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

    const data = await response.json() as any;

    if (data && (data.status === "success" || data.code === 200 || data.type === "success")) {
      console.log(`[OTP] Successfully dispatched ${channel.toUpperCase()} OTP to ${cleanPhone} via APITxT`);
      return { success: true, message: "OTP sent successfully.", response: data };
    } else {
      const errorMsg = data.message || JSON.stringify(data);
      console.error(`[OTP] APITxT returned error for ${cleanPhone}:`, errorMsg);
      return { success: false, message: errorMsg, response: data };
    }
  } catch (error: any) {
    console.error(`[OTP] Exception calling APITxT for ${cleanPhone}:`, error);
    return { success: false, message: error.message || "Network error contacting APITxT." };
  }
}
