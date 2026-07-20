/**
 * Transactional email — Resend when configured, otherwise log the message
 * (works for local magic-link testing without an email provider).
 */

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "Online Data Sub <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — logging email instead of sending");
    console.log("---------- magic link email (dev) ----------");
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(params.text);
    console.log("--------------------------------------------");
    return { simulated: true as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, "<br/>"),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }

  return { simulated: false as const, ...(await res.json()) };
}

export async function sendMagicLinkEmail(to: string, link: string) {
  const subject = "Your Online Data Sub sign-in link";
  const text = [
    "Sign in to Online Data Sub with this one-time link:",
    "",
    link,
    "",
    "This link expires in 15 minutes and can only be used once.",
    "If you did not request it, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Sign in to <strong>Online Data Sub</strong> with this one-time link:</p>
    <p><a href="${link}">Sign in to Online Data Sub</a></p>
    <p style="color:#666;font-size:13px">Or paste this URL into your browser:<br/>${link}</p>
    <p style="color:#666;font-size:13px">Expires in 15 minutes. One-time use only.</p>
  `;

  return sendEmail({ to, subject, text, html });
}
