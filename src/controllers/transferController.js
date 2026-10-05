import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { generateOTP, hashOTP, otpMatches } from "../utils/otp.js";
import { sendOTPEmail } from "../utils/email.js";
import {
  sendDebitEmail,
  sendCreditEmail,
} from "../utils/transactionEmail.js";

// Request a transfer (Send OTP)
export const transferMoney = async (req, res) => {
  try {
    const { accountNumber, amount } = req.body;

    if (!accountNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "Account number and amount are required.",
      });
    }

    const sender = await User.findById(req.user._id).select(
      "+otp +otpExpires +pendingTransfer"
    );

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (sender.isFrozen) {
      return res.status(403).json({
        success: false,
        message: "Your account has been frozen.",
      });
    }

    const receiver = await User.findOne({ accountNumber });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    if (receiver.isFrozen) {
      return res.status(403).json({
        success: false,
        message: "Receiver account is frozen.",
      });
    }

    if (sender._id.toString() === receiver._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot transfer money to yourself.",
      });
    }

    const transferAmount = Number(amount);

    if (transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero.",
      });
    }

    if (sender.balance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance.",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store hashed OTP
    sender.otp = hashOTP(otp);
    sender.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    sender.pendingTransfer = {
      receiver: receiver._id,
      amount: transferAmount,
    };

    await sender.save();

    // Send plain OTP to email
    await sendOTPEmail(sender.email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP has been sent to your email. Verify to complete the transfer.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify OTP & Complete Transfer
export const verifyTransfer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { otp } = req.body;

    let transferResult;

    await session.withTransaction(async () => {
      const sender = await User.findById(req.user._id)
        .select("+otp +otpExpires +pendingTransfer")
        .session(session);

      if (!sender) {
        throw Object.assign(new Error("User not found."), { statusCode: 404 });
      }

      if (sender.isFrozen) {
        throw Object.assign(new Error("Your account has been frozen."), { statusCode: 403 });
      }

      if (!sender.otpExpires || sender.otpExpires < new Date()) {
        throw Object.assign(new Error("OTP has expired."), { statusCode: 400 });
      }

      if (!sender.otp || !otpMatches(otp, sender.otp)) {
        throw Object.assign(new Error("Invalid OTP."), { statusCode: 400 });
      }

      if (!sender.pendingTransfer?.receiver) {
        throw Object.assign(new Error("No pending transfer found."), { statusCode: 400 });
      }

      const receiver = await User.findById(sender.pendingTransfer.receiver).session(session);

      if (!receiver) {
        throw Object.assign(new Error("Receiver not found."), { statusCode: 404 });
      }

      if (receiver.isFrozen) {
        throw Object.assign(new Error("Receiver account is frozen."), { statusCode: 403 });
      }

      const transferAmount = sender.pendingTransfer.amount;

      if (sender.balance < transferAmount) {
        throw Object.assign(new Error("Insufficient balance."), { statusCode: 400 });
      }

      sender.balance -= transferAmount;
      receiver.balance += transferAmount;

      sender.otp = null;
      sender.otpExpires = null;
      sender.pendingTransfer = {
        receiver: null,
        amount: null,
      };

      await sender.save({ session });
      await receiver.save({ session });
      await Transaction.create(
        [{
          sender: sender._id,
          receiver: receiver._id,
          amount: transferAmount,
          status: "Successful",
        }],
        { session }
      );

      transferResult = {
        sender,
        receiver,
        transferAmount,
      };
    });

    // Send emails (don't fail transfer if email fails)
    try {
      await sendDebitEmail(
        transferResult.sender.email,
        transferResult.sender.fullname,
        transferResult.transferAmount,
        transferResult.receiver.fullname,
        transferResult.sender.balance
      );

      await sendCreditEmail(
        transferResult.receiver.email,
        transferResult.receiver.fullname,
        transferResult.transferAmount,
        transferResult.sender.fullname,
        transferResult.receiver.balance
      );
    } catch (emailError) {
      console.error("Email Error:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Transfer completed successfully.",
      balance: transferResult.sender.balance,
    });
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  } finally {
    await session.endSession();
  }
};