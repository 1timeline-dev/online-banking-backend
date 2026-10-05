import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

export const getPublicStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalTransactions = await Transaction.countDocuments();

    res.status(200).json({
      success: true,
      totalUsers,
      totalTransactions,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};