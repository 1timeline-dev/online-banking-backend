import mongoose from "mongoose";

const pendingTransferSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },

    balance: {
      type: Number,
      default: 10000,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Balance must be a finite number.",
      },
    },

    // Profile Picture
    profileImage: {
      type: String,
      default: "",
    },

    // Email Verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: null,
      select: false,
    },

    emailOtp: {
      type: String,
      default: null,
      select: false,
    },

    emailOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },

    emailOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    emailOtpSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    // Freeze Account
    isFrozen: {
      type: Boolean,
      default: false,
    },

    // User Role
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // OTP for Transfer
    otp: {
      type: String,
      default: null,
      select: false,
    },

    otpExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // Password Reset
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // Saved Beneficiaries
    beneficiaries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Pending Transfer
    pendingTransfer: {
      type: pendingTransferSchema,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
