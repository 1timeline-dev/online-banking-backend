import { sendEmail } from "../../emailTransport.js";

export const sendOTPEmail = async (email, otp) => {
  try {
    const info = await sendEmail({
      to: email,
      subject: "Online Banking OTP Verification",
      html: `
        <h2>Online Banking</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
      `,
    });

    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Email Error:", error.message);
    throw error;
  }
};