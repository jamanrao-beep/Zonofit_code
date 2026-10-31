/**
 * Utility to send OTP via APITxT (supports SMS and WhatsApp without requiring custom DLT registration)
 * with graceful fallback to Fast2SMS.
 */
export interface SMSResult {
  success: boolean;
  message?: string;
  response?: any;
}

export async function sendOTP(phone: string, code: string): Promise<SMSResult> {
  const apitxtKey = (process.env.APITXT_AUTH_KEY || "LfoDh9dYrJrDmuLt2KXMkCe12gd8MzAqoUOhjJ4laMg").trim();
  const fast2smsKey = (process.env.FAST2SMS_API_KEY || "").trim();
  const channel = (process.env.OTP_CHANNEL || "sms").trim().toLowerCase(); // "sms" or "whatsapp"

  // Sanitize phone number (extract digits only)
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
    cleanPhone = cleanPhone.slice(2);
  }

  // 1. Primary Route: APITxT
  if (apitxtKey && !apitxtKey.includes("placeholder") && apitxtKey.length > 10) {
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
        return { success: true, message: "OTP sent successfully." };
      } else {
        const errorMsg = data.message || JSON.stringify(data);
        console.error(`[OTP] APITxT returned error for ${cleanPhone}:`, errorMsg);
        
        // If it's a balance issue or failure, try Fast2SMS fallback if configured
        if (!fast2smsKey || fast2smsKey.includes("placeholder")) {
          return { success: false, message: errorMsg, response: data };
        }
      }
    } catch (error: any) {
      console.error(`[OTP] Exception calling APITxT for ${cleanPhone}:`, error);
      if (!fast2smsKey || fast2smsKey.includes("placeholder")) {
        return { success: false, message: error.message || "Network error contacting OTP provider." };
      }
    }
  }

  // 2. Secondary Fallback Route: Fast2SMS (if configured)
  if (fast2smsKey && !fast2smsKey.includes("placeholder") && fast2smsKey.length >= 8) {
    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2smsKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: code,
          numbers: cleanPhone,
        })
      });

      const data = await response.json() as any;
      if (data.return) {
        console.log(`[OTP] Successfully sent OTP to ${cleanPhone} via Fast2SMS`);
        return { success: true, message: "OTP sent successfully." };
      } else {
        const errMsg = Array.isArray(data.message) ? data.message.join(", ") : (data.message || JSON.stringify(data));
        console.error(`[OTP] Fast2SMS error:`, errMsg);
        return { success: false, message: errMsg, response: data };
      }
    } catch (error: any) {
      console.error(`[OTP] Exception calling Fast2SMS:`, error);
      return { success: false, message: error.message || "Fast2SMS error." };
    }
  }

  return { success: false, message: "No valid OTP provider configured." };
}
