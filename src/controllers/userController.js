import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import bcrypt from "bcrypt";
// Get Logged-in User Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get User Balance
export const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("balance");

    return res.status(200).json({
      success: true,
      balance: user.balance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Get Transaction History
export const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id },
      ],
    })
      .populate("sender", "fullname accountNumber")
      .populate("receiver", "fullname accountNumber")
      .sort({ createdAt: -1 });

    const formattedTransactions = transactions.map((transaction) => ({
      ...transaction.toObject(),
      type:
        transaction.sender._id.toString() === req.user._id.toString()
          ? "Debit"
          : "Credit",
    }));

    return res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      transactions: formattedTransactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Search Account by Account Number
export const searchAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const user = await User.findOne({ accountNumber }).select(
      "fullname accountNumber"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
