import User from "../models/User.js";

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    const user = await User.findById(req.user._id);

    user.profileImage = req.file.path;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully.",
      image: user.profileImage,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};