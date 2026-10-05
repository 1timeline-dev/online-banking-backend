import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController.js";
import validate from "../middleware/validate.js";
import {
  emailValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
} from "../validators/authValidators.js";

const router = express.Router();

// Authentication
router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);

// Email Verification
router.get("/verify-email/:token", verifyEmail);

// Password Reset
router.post("/forgot-password", emailValidation, validate, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidation, validate, resetPassword);

export default router;
