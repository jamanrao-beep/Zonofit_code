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

  // Dispatch through both SMS and WhatsApp concurrently to guarantee delivery
  const [smsOutcome, waOutcome] = await Promise.allSettled([
    callApitxt(apitxtKey, cleanPhone, code, "sms"),
    callApitxt(apitxtKey, cleanPhone, code, "whatsapp"),
  ]);

  const smsResult = smsOutcome.status === "fulfilled" ? smsOutcome.value : null;
  const waResult = waOutcome.status === "fulfilled" ? waOutcome.value : null;

  if (smsResult?.success || waResult?.success) {
    const deliveredChannels = [
      smsResult?.success ? "SMS" : null,
      waResult?.success ? "WhatsApp" : null,
    ].filter(Boolean).join(" & ");

    console.log(`[OTP] Successfully dispatched OTP ${code} to ${cleanPhone} via ${deliveredChannels}`);
    return {
      success: true,
      message: `OTP sent successfully via ${deliveredChannels}.`,
      response: smsResult?.response || waResult?.response,
    };
  }

  const errorMsg = smsResult?.message || waResult?.message || "Failed to deliver OTP via SMS or WhatsApp.";
  console.error(`[OTP] Delivery failed for ${cleanPhone}:`, errorMsg);
  return { success: false, message: errorMsg };
}

async function callApitxt(authkey: string, cleanPhone: string, code: string, channel: string): Promise<SMSResult> {
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

    const data = await response.json() as any;

    if (data && (data.status === "success" || data.code === 200 || data.type === "success")) {
      console.log(`[OTP] Successfully dispatched ${channel.toUpperCase()} OTP to ${cleanPhone} via APITxT (RequestId: ${data.data?.request_id || "N/A"})`);
      return { success: true, message: "OTP sent successfully.", response: data };
    } else {
      const errorMsg = data.message || JSON.stringify(data);
      console.error(`[OTP] APITxT ${channel.toUpperCase()} error for ${cleanPhone}:`, errorMsg);
      return { success: false, message: errorMsg, response: data };
    }
  } catch (error: any) {
    console.error(`[OTP] Exception calling APITxT ${channel.toUpperCase()} for ${cleanPhone}:`, error);
    return { success: false, message: error.message || "Network error contacting APITxT." };
  }
}
