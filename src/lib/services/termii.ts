// Termii — https://developers.termii.com
// NOTE: ask Termii support to activate the "DND route" on your account
// before relying on this for OTPs — the default generic route silently
// skips numbers on Do-Not-Disturb and pauses on MTN between 8PM–8AM.

const TERMII_BASE_URL = "https://api.ng.termii.com/api";

export async function sendSms(phone: string, message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.warn("[termii] TERMII_API_KEY not set — logging instead of sending");
    console.log(`[termii:dev] would send to ${phone}: ${message}`);
    return { simulated: true };
  }

  const res = await fetch(`${TERMII_BASE_URL}/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to: phone,
      from: process.env.TERMII_SENDER_ID || "OnlineDataSub",
      sms: message,
      type: "plain",
      channel: "dnd", // transactional route — see note above
    }),
  });

  if (!res.ok) {
    throw new Error(`Termii send failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function sendOtpSms(phone: string, code: string) {
  return sendSms(phone, `Your Online Data Sub verification code is ${code}. It expires in 10 minutes.`);
}
