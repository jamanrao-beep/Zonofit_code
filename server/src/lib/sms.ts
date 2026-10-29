/**
 * Utility to send SMS using Fast2SMS API.
 * Fast2SMS is a popular and cost-effective SMS gateway in India.
 */
export async function sendOTP(phone: string, code: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey || apiKey.includes("placeholder") || apiKey.length < 8) {
    if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true") {
      console.warn("[SMS] Dev OTP is enabled. The code was not logged.");
      return true;
    }
    console.error("[SMS] Refusing to pretend an OTP was sent. Set FAST2SMS_API_KEY.");
    return false;
  }

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: code,
        numbers: phone,
      })
    });

    const data = await response.json() as any;
    
    if (data.return) {
      console.log(`[SMS] Successfully sent OTP to ${phone}`);
      return true;
    } else {
      console.error(`[SMS] Failed to send OTP to ${phone}:`, data.message);
      return false;
    }
  } catch (error) {
    console.error(`[SMS] Exception sending OTP to ${phone}:`, error);
    return false;
  }
}
