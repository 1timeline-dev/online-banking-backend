// Sends email through Brevo's HTTP API (works on Render's free tier,
// unlike SMTP which Render blocks on ports 25/465/587).

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;
  const senderName = process.env.EMAIL_FROM_NAME || "SecureTrust Bank";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }

  if (!senderEmail) {
    throw new Error("EMAIL_FROM is not set");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        `Brevo API error ${response.status}: ${data.message || JSON.stringify(data)}`
      );
    }

    return data; // { messageId: "..." }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Brevo API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

console.log(
  process.env.BREVO_API_KEY && process.env.EMAIL_FROM
    ? "✅ Brevo email is configured"
    : "⚠️ Brevo email is NOT configured (check BREVO_API_KEY and EMAIL_FROM)"
);