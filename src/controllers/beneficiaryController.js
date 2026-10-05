import Beneficiary from "../models/Beneficiary.js";
import User from "../models/User.js";

// Add beneficiary
export const addBeneficiary = async (req, res) => {
  try {
    const { accountNumber, nickname } = req.body;

    const receiver = await User.findOne({ accountNumber });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (receiver._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself.",
      });
    }

    const exists = await Beneficiary.findOne({
      owner: req.user._id,
      beneficiary: receiver._id,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Beneficiary already exists.",
      });
    }

    const beneficiary = await Beneficiary.create({
      owner: req.user._id,
      beneficiary: receiver._id,
      nickname,
    });

    res.status(201).json({
      success: true,
      beneficiary,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get beneficiaries
export const getBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find({
      owner: req.user._id,
    }).populate(
      "beneficiary",
      "fullname accountNumber email"
    );

    res.json({
      success: true,
      beneficiaries,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete beneficiary
export const deleteBeneficiary = async (req, res) => {
  try {
    await Beneficiary.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    res.json({
      success: true,
      message: "Beneficiary removed.",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};