import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { sendResetPasswordEmail } from "../utils/resetPasswordEmail.js";
import { sendVerificationOtpEmail } from "../utils/verificationEmail.js";
import { generateOTP, hashOTP, otpMatches } from "../utils/otp.js";

// ================= GENERATE ACCOUNT NUMBER =================

const generateAccountNumber = () => {
  return Math.floor(
    1000000000 + Math.random() * 9000000000
  ).toString();
};

// ================= OTP HELPERS =================

const OTP_EXPIRY_MS = 10 * 60 * 1000; // code valid for 10 minutes
const OTP_MAX_ATTEMPTS = 5; // wrong guesses allowed per code
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // wait 60s between emails

// Puts a fresh OTP on the user document (caller saves it) and returns the plain code
const attachNewOtp = (user) => {
  const otp = generateOTP();
  user.emailOtp = hashOTP(otp);
  user.emailOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  user.emailOtpAttempts = 0;
  user.emailOtpSentAt = new Date();
  return otp;
};

// ================= REGISTER =================

export const register = async (req, res) => {
  try {
    let { fullname, email, password } = req.body;

    // Clean input
    fullname = fullname?.trim();
    email = email?.trim().toLowerCase();

    // Validate fields
    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    console.log("=================================");
    console.log("📝 NEW REGISTRATION REQUEST");
    console.log("Name:", fullname);
    console.log("Email:", email);
    console.log("=================================");

    const existingUser = await User.findOne({ email }).select(
      "+emailOtpSentAt"
    );

    // Verified accounts can't be registered again
    if (existingUser && existingUser.isVerified) {
      console.log("⚠️ Registration rejected: email already exists");

      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ---------- Unverified account already exists: send a fresh code ----------
    if (existingUser) {
      const sentAgo = existingUser.emailOtpSentAt
        ? Date.now() - existingUser.emailOtpSentAt.getTime()
        : Infinity;

      if (sentAgo < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - sentAgo) / 1000);

        return res.status(429).json({
          success: false,
          message: `A code was just sent. Please wait ${wait}s before trying again.`,
        });
      }

      existingUser.fullname = fullname;
      existingUser.password = hashedPassword;
      const otp = attachNewOtp(existingUser);
      await existingUser.save();

      try {
        await sendVerificationOtpEmail(existingUser.email, otp);
      } catch (emailError) {
        console.error("❌ VERIFICATION EMAIL FAILED");
        console.error(emailError);

        return res.status(500).json({
          success: false,
          message:
            "We could not send the verification code. Please try again.",
        });
      }

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        email: existingUser.email,
        message: "A new verification code has been sent to your email.",
      });
    }

    // ---------- Brand new account ----------
    const accountNumber = generateAccountNumber();

    const user = new User({
      fullname,
      email,
      password: hashedPassword,
      accountNumber,
      isVerified: false,
    });

    const otp = attachNewOtp(user);
    await user.save();

    console.log("✅ USER CREATED");
    console.log("User ID:", user._id);
    console.log("Email:", user.email);

    try {
      await sendVerificationOtpEmail(user.email, otp);

      console.log("✅ VERIFICATION CODE SENT");

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        email: user.email,
        message: "Registration successful. A 6-digit code has been sent to your email.",
      });
    } catch (emailError) {
      console.error("❌ VERIFICATION EMAIL FAILED");
      console.error(emailError);

      // Remove the new account so the user can simply try again
      try {
        await User.findByIdAndDelete(user._id);
        console.log("🗑️ User removed because verification email failed.");
      } catch (deleteError) {
        console.error("❌ Could not remove failed registration:", deleteError);
      }

      return res.status(500).json({
        success: false,
        message:
          "Account could not be created because the verification email could not be sent. Please try again.",
      });
    }
  } catch (error) {
    console.error("❌ REGISTRATION ERROR");
    console.error(error);

    // Handle duplicate email/account number race conditions
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      if (duplicateField === "email") {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (duplicateField === "accountNumber") {
        return res.status(500).json({
          success: false,
          message: "Could not generate a unique account number. Please try again.",
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

// ================= VERIFY EMAIL (OTP) =================

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email?.trim().toLowerCase(),
    }).select("+emailOtp +emailOtpExpires +emailOtpAttempts");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified. You can log in.",
      });
    }

    if (
      !user.emailOtp ||
      !user.emailOtpExpires ||
      user.emailOtpExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "This code has expired. Please request a new one.",
      });
    }

    if (user.emailOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (!otpMatches(otp, user.emailOtp)) {
      user.emailOtpAttempts += 1;
      await user.save();

      const left = OTP_MAX_ATTEMPTS - user.emailOtpAttempts;

      return res.status(400).json({
        success: false,
        message:
          left > 0
            ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`
            : "Too many incorrect attempts. Please request a new code.",
      });
    }

    user.isVerified = true;
    user.emailOtp = null;
    user.emailOtpExpires = null;
    user.emailOtpAttempts = 0;
    user.emailOtpSentAt = null;
    await user.save();

    console.log("✅ Email verified:", user.email);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

// ================= RESEND OTP =================

export const resendEmailOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+emailOtpSentAt");

    // Same response whether or not the account exists / is verified
    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "If this account needs verification, a new code has been sent.",
      });
    }

    const sentAgo = user.emailOtpSentAt
      ? Date.now() - user.emailOtpSentAt.getTime()
      : Infinity;

    if (sentAgo < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - sentAgo) / 1000);

      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting another code.`,
        retryAfter: wait,
      });
    }

    const otp = attachNewOtp(user);
    await user.save();

    try {
      await sendVerificationOtpEmail(user.email, otp);
    } catch (emailError) {
      console.error("❌ RESEND EMAIL FAILED");
      console.error(emailError);

      return res.status(500).json({
        success: false,
        message: "We could not send the code. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("❌ Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not resend the code. Please try again.",
    });
  }
};

// ================= LOGIN =================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Frozen account check
    if (user.isFrozen) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been frozen. Please contact support.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Email verification check (after the password is confirmed)
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        needsVerification: true,
        email: user.email,
        message: "Please verify your email before logging in.",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES || "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,

      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: user.balance,
        profileImage: user.profileImage,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("❌ Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ================= FORGOT PASSWORD =================

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate reset token
    const token = crypto
      .randomBytes(32)
      .toString("hex");

    user.resetPasswordToken = token;

    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    console.log("📧 Sending password reset email...");

    await sendResetPasswordEmail(
      user.email,
      token
    );

    console.log("✅ Password reset email sent!");

    return res.status(200).json({
      success: true,
      message:
        "Password reset link sent to your email.",
    });

  } catch (error) {
    console.error("❌ Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Could not send password reset email. Please try again.",
    });
  }
};

// ================= RESET PASSWORD =================

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and password are required.",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
    }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token.",
      });
    }

    if (
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Reset link has expired.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful.",
    });

  } catch (error) {
    console.error("❌ Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Password reset failed.",
    });
  }
};

// ================= VERIFY EMAIL =================

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send(`
        <h2>Invalid Verification Link ❌</h2>
        <p>No verification token was provided.</p>
      `);
    }

    const user = await User.findOne({
      verificationToken: token,
    });

    if (!user) {
      return res.status(400).send(`
        <h2>Invalid Verification Link ❌</h2>
        <p>This verification link is invalid or has already been used.</p>
      `);
    }

    user.isVerified = true;
    user.verificationToken = null;

    await user.save();

    console.log("✅ Email verified:", user.email);

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Verified</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>

        <body style="
          margin:0;
          font-family:Arial,sans-serif;
          background:#f3f4f6;
          display:flex;
          justify-content:center;
          align-items:center;
          min-height:100vh;
        ">

          <div style="
            background:white;
            padding:40px;
            border-radius:12px;
            text-align:center;
            max-width:500px;
            margin:20px;
            box-shadow:0 10px 30px rgba(0,0,0,0.1);
          ">

            <h1 style="color:#16a34a;">
              Email Verified Successfully ✅
            </h1>

            <p style="color:#374151;font-size:16px;">
              Your Online Banking account has been verified successfully.
            </p>

            <a
              href="${process.env.CLIENT_URL}/login"
              style="
                display:inline-block;
                margin-top:20px;
                background:#0d6efd;
                color:white;
                text-decoration:none;
                padding:14px 25px;
                border-radius:6px;
                font-weight:bold;
              "
            >
              Click here to login
            </a>

          </div>

        </body>
      </html>
    `);

  } catch (error) {
    console.error("❌ Email verification error:", error);

    return res.status(500).send(`
      <h2>Something went wrong ❌</h2>
      <p>We could not verify your email.</p>
    `);
  }
};