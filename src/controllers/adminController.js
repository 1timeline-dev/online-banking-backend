import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// Get all users with search & pagination
export const getAllUsers = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = 10;

    const query = {
      $or: [
        {
          fullname: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          accountNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    };

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

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

// Get all transactions
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("sender", "fullname accountNumber")
      .populate("receiver", "fullname accountNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Dashboard statistics
export const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const users = await User.find();

    const totalBalance = users.reduce(
      (sum, user) => sum + user.balance,
      0
    );

    return res.status(200).json({
      success: true,
      totalUsers,
      totalTransactions,
      totalBalance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Freeze User
export const freezeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isFrozen = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `${user.fullname}'s account has been frozen.`,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Unfreeze User
export const unfreezeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isFrozen = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `${user.fullname}'s account has been unfrozen.`,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getUserTransactions = async (req, res) => {
  try {
    const { id } = req.params;

    const transactions = await Transaction.find({
      $or: [
        { sender: id },
        { receiver: id },
      ],
    })
      .populate("sender", "fullname accountNumber")
      .populate("receiver", "fullname accountNumber")
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch transactions.",
    });
  }
};