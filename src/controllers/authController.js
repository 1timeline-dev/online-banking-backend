import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { sendResetPasswordEmail } from "../utils/resetPasswordEmail.js";
import { sendVerificationEmail } from "../utils/verificationEmail.js";

// ================= GENERATE ACCOUNT NUMBER =================

const generateAccountNumber = () => {
  return Math.floor(
    1000000000 + Math.random() * 9000000000
  ).toString();
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

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("⚠️ Registration rejected: email already exists");

      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Generate account number
    const accountNumber = generateAccountNumber();

    // Create user
    const user = await User.create({
      fullname,
      email,
      password: hashedPassword,
      accountNumber,
      verificationToken,
      isVerified: false,
    });

    console.log("✅ USER CREATED");
    console.log("User ID:", user._id);
    console.log("Email:", user.email);

    // ================= SEND VERIFICATION EMAIL =================

    try {
      console.log("📧 Sending verification email...");
      console.log("To:", user.email);

      await sendVerificationEmail(
        user.email,
        verificationToken
      );

      console.log("✅ VERIFICATION EMAIL SENT");

      return res.status(201).json({
        success: true,
        message:
          "Registration successful. A verification link has been sent to your email.",
      });

    } catch (emailError) {
      console.error("❌ VERIFICATION EMAIL FAILED");
      console.error(emailError);

      // Remove the newly-created account if the email
      // could not be sent. This prevents users from being
      // stuck with an unverified account.
      try {
        await User.findByIdAndDelete(user._id);

        console.log(
          "🗑️ User removed because verification email failed."
        );
      } catch (deleteError) {
        console.error(
          "❌ Could not remove failed registration:",
          deleteError
        );
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
      const duplicateField = Object.keys(
        error.keyPattern || {}
      )[0];

      if (duplicateField === "email") {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (duplicateField === "accountNumber") {
        return res.status(500).json({
          success: false,
          message:
            "Could not generate a unique account number. Please try again.",
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
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

    // Email verification check
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message:
          "Please verify your email before logging in.",
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