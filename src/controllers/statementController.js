import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { generatePDF } from "../utils/pdf.js";

export const generateStatement = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const transactions = await Transaction.find({
      $or: [{ sender: user._id }, { receiver: user._id }],
    })
      .populate("sender", "fullname accountNumber")
      .populate("receiver", "fullname accountNumber")
      .sort({ createdAt: -1 });

    return generatePDF(user, transactions, res);
  } catch (error) {
    console.error("Failed to generate bank statement:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate bank statement.",
      });
    }

    res.end();
  }
};
