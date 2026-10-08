import { sendEmail } from "../../emailTransport.js";

export const sendVerificationOtpEmail = async (email, otp) => {
  try {
    const info = await sendEmail({
      to: email,
      subject: "Your SecureTrust Bank verification code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#0f172a;">
          <h1 style="color:#0f766e;">SecureTrust Bank</h1>
          <h2>Verify your email address</h2>
          <p>Enter this one-time code to finish creating your account:</p>
          <p style="margin:28px 0;font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</p>
          <p>This code expires in 10 minutes. If you did not create an account, you can ignore this email.</p>
        </div>
      `,
    });

    console.log("✅ VERIFICATION CODE SENT. Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ VERIFICATION EMAIL FAILED!", error.message);
    throw error;
  }
};

export const sendVerificationEmail = async (email, token) => {
  const verificationLink =
    `${process.env.API_URL.replace(/\/$/, "")}/api/auth/verify-email/${token}`;

  console.log("📧 Sending verification email to:", email);

  try {
    const info = await sendEmail({
      to: email,
      subject: "Verify Your SecureTrust Bank Account",

      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">
          <h1 style="color:#0d6efd;">SecureTrust Bank</h1>

          <h2>Welcome!</h2>

          <p>
            Thank you for creating your SecureTrust Bank account.
          </p>

          <p>
            Please click the button below to verify your email address.
          </p>

          <div style="margin:30px 0;">
            <a
              href="${verificationLink}"
              style="
                background:#0d6efd;
                color:white;
                padding:14px 25px;
                text-decoration:none;
                border-radius:6px;
                display:inline-block;
              "
            >
              Verify Email
            </a>
          </div>

          <p>
            If the button doesn't work, copy this link:
          </p>

          <p style="word-break:break-all;">
            ${verificationLink}
          </p>

          <hr>

          <p style="color:#777;font-size:13px;">
            If you did not create this account, you can ignore this email.
          </p>
        </div>
      `,
    });

    console.log("✅ VERIFICATION EMAIL SENT. Message ID:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ EMAIL FAILED!", error.message);
    throw error;
  }
};