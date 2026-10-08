import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyEmailOtp,
  resendEmailOtp,
} from "../controllers/authController.js";
import validate from "../middleware/validate.js";
import {
  emailValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
  verifyEmailOtpValidation,
} from "../validators/authValidators.js";

const router = express.Router();

// Authentication
router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);

// Email Verification
router.post("/verify-email-otp", verifyEmailOtpValidation, validate, verifyEmailOtp);
router.post("/resend-email-otp", emailValidation, validate, resendEmailOtp);
router.get("/verify-email/:token", verifyEmail);

// Password Reset
router.post("/forgot-password", emailValidation, validate, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidation, validate, resetPassword);

export default router;
