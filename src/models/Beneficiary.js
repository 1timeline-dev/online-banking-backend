import mongoose from "mongoose";

const beneficiarySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    nickname: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Beneficiary", beneficiarySchema);