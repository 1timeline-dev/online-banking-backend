import crypto from "crypto";

export const generateOTP = () => {
  return crypto.randomInt(100000, 1_000_000).toString();
};

export const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const otpMatches = (otp, storedHash) => {
  const submittedHash = hashOTP(otp);
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
};
