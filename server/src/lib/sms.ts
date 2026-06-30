/**
 * Utility to send SMS using Fast2SMS API.
 * Fast2SMS is a popular and cost-effective SMS gateway in India.
 */
export async function sendOTP(phone: string, code: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // Fallback for development if no API key is provided
    console.log(`[SMS-MOCK] Missing API key.`);
    console.log(`[SMS-MOCK] Sending code ${code} to ${phone}`);
    return true;
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
