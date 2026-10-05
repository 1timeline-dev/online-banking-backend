import { body, param } from "express-validator";

const passwordRules = (field = "password") =>
  body(field)
    .isString()
    .withMessage("Password must be a string.")
    .isStrongPassword({
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage("Password must be at least 12 characters and include upper-case, lower-case, and a number.");

export const registerValidation = [
  body("fullname").trim().isLength({ min: 2, max: 100 }).withMessage("Full name must be 2 to 100 characters."),
  body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
  passwordRules(),
];

export const loginValidation = [
  body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required."),
];

export const emailValidation = [
  body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
];

export const resetPasswordValidation = [
  param("token").isHexadecimal().isLength({ min: 64, max: 64 }).withMessage("Invalid reset token."),
  passwordRules(),
];

export const changePasswordValidation = [
  body("currentPassword").isString().notEmpty().withMessage("Current password is required."),
  passwordRules("newPassword"),
];

export const transferValidation = [
  body("accountNumber").isString().trim().matches(/^\d{10}$/).withMessage("Account number must be 10 digits."),
  body("amount").isFloat({ gt: 0, max: 10_000_000 }).withMessage("Amount must be a positive number."),
];

export const transferOtpValidation = [
  body("otp").isString().matches(/^\d{6}$/).withMessage("OTP must be a 6-digit code."),
];
