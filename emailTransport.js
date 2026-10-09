// Sends email through the Gmail API over HTTPS (port 443).
// Works on Render's free tier, unlike SMTP (ports 25/465/587 are blocked there).
//
// Required environment variables:
//   GMAIL_CLIENT_ID
//   GMAIL_CLIENT_SECRET
//   GMAIL_REFRESH_TOKEN
//   EMAIL_FROM        -> the SAME Gmail address you authorised in the OAuth Playground
//   EMAIL_FROM_NAME   -> optional display name (default: SecureTrust Bank)

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const REQUEST_TIMEOUT_MS = 15000;

// ---------- access token (cached until shortly before it expires) ----------

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Gmail API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const getAccessToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60 * 1000) {
    return cachedToken;
  }

  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } =
    process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error(
      "Gmail is not configured: set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN"
    );
  }

  const response = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      throw new Error(
        "Gmail refresh token is expired or revoked. Generate a new one in the OAuth Playground and update GMAIL_REFRESH_TOKEN."
      );
    }

    throw new Error(
      `Gmail token error ${response.status}: ${
        data.error_description || data.error || JSON.stringify(data)
      }`
    );
  }

  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  return cachedToken;
};

// ---------- building the raw email message ----------

// Remove line breaks so nobody can inject extra email headers
const clean = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

// Encode text for headers (needed for non-English characters)
const encodeHeader = (value) => {
  const text = clean(value);
  return /^[\x20-\x7E]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
};

const wrap76 = (base64) => base64.replace(/(.{76})/g, "$1\r\n");

const htmlToText = (html) =>
  String(html)
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

const buildRawMessage = ({ from, fromName, to, subject, html }) => {
  const boundary = `b_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2)}`;

  const text = htmlToText(html);

  const lines = [
    `From: ${encodeHeader(fromName)} <${clean(from)}>`,
    `To: ${clean(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(text, "utf8").toString("base64")),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(String(html), "utf8").toString("base64")),
    `--${boundary}--`,
    "",
  ];

  // Gmail API wants the whole message base64url-encoded
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
};

// ---------- public function used by the rest of the app ----------

export const sendEmail = async ({ to, subject, html }) => {
  const from = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || "SecureTrust Bank";

  if (!from) {
    throw new Error("EMAIL_FROM is not set");
  }

  if (!to) {
    throw new Error("Recipient email is missing");
  }

  const accessToken = await getAccessToken();

  const raw = buildRawMessage({ from, fromName, to, subject, html });

  const response = await fetchWithTimeout(SEND_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // A 401 can mean the cached token went stale; drop it so the next call refreshes
    if (response.status === 401) {
      cachedToken = null;
      cachedTokenExpiresAt = 0;
    }

    throw new Error(
      `Gmail API error ${response.status}: ${
        data.error?.message || JSON.stringify(data)
      }`
    );
  }

  // Keep the same shape the rest of the code expects: info.messageId
  return { messageId: data.id, threadId: data.threadId };
};

console.log(
  process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.EMAIL_FROM
    ? "✅ Gmail API email is configured"
    : "⚠️ Gmail API email is NOT configured (check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, EMAIL_FROM)"
);