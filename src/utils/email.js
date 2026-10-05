import { sendEmail } from "../../emailTransport.js";

export const sendOTPEmail = async (email, otp) => {
  await sendEmail({
    to: email,
    subject: "Your SecureTrust Bank transfer verification code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">
        <h2>Confirm your transfer</h2>
        <p>Use this one-time code to verify your transfer:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${otp}</p>
        <p>This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
};

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);

// ================= DEBIT EMAIL =================
export const sendDebitEmail = async (
  email,
  fullname,
  amount,
  receiverName,
  balance
) => {
  await sendEmail({
    to: email,
    subject: "Debit Alert",

    html: `
      <div style="font-family:Arial;padding:30px;background:#f5f5f5;">
        <div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px">

          <h2 style="color:#d32f2f;">Debit Alert</h2>

          <p>Hello <strong>${fullname}</strong>,</p>

          <p>Your account has been debited successfully.</p>

          <table style="width:100%;margin-top:20px;border-collapse:collapse;">
            <tr>
              <td><strong>Amount</strong></td>
              <td>${formatAmount(amount)}</td>
            </tr>

            <tr>
              <td><strong>Sent To</strong></td>
              <td>${receiverName}</td>
            </tr>

            <tr>
              <td><strong>Date</strong></td>
              <td>${new Date().toLocaleString()}</td>
            </tr>

            <tr>
              <td><strong>Available Balance</strong></td>
              <td>${formatAmount(balance)}</td>
            </tr>

            <tr>
              <td><strong>Status</strong></td>
              <td style="color:green;">Successful</td>
            </tr>
          </table>

          <br>

          <p>If you did not authorize this transaction, contact support immediately.</p>

          <hr>

          <small>Online Banking Simulation</small>

        </div>
      </div>
    `,
  });
};

// ================= CREDIT EMAIL =================
export const sendCreditEmail = async (
  email,
  fullname,
  amount,
  senderName,
  balance
) => {
  await sendEmail({
    to: email,
    subject: "Credit Alert",

    html: `
      <div style="font-family:Arial;padding:30px;background:#f5f5f5;">
        <div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px">

          <h2 style="color:#2e7d32;">Credit Alert</h2>

          <p>Hello <strong>${fullname}</strong>,</p>

          <p>Your account has been credited successfully.</p>

          <table style="width:100%;margin-top:20px;border-collapse:collapse;">
            <tr>
              <td><strong>Amount</strong></td>
              <td>${formatAmount(amount)}</td>
            </tr>

            <tr>
              <td><strong>Received From</strong></td>
              <td>${senderName}</td>
            </tr>

            <tr>
              <td><strong>Date</strong></td>
              <td>${new Date().toLocaleString()}</td>
            </tr>

            <tr>
              <td><strong>Available Balance</strong></td>
              <td>${formatAmount(balance)}</td>
            </tr>

            <tr>
              <td><strong>Status</strong></td>
              <td style="color:green;">Successful</td>
            </tr>
          </table>

          <br>

          <p>Thank you for banking with us.</p>

          <hr>

          <small>Online Banking Simulation</small>

        </div>
      </div>
    `,
  });
};