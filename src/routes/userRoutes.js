import express from "express";
import auth from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  changePasswordValidation,
  transferOtpValidation,
  transferValidation,
} from "../validators/authValidators.js";

import {
  transferMoney,
  verifyTransfer,
} from "../controllers/transferController.js";

import {
  getProfile,
  getBalance,
  getTransactionHistory,
  searchAccount,
   changePassword,
   
} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", auth, getProfile);
router.get("/balance", auth, getBalance);
router.get("/transactions", auth, getTransactionHistory);
router.get("/search/:accountNumber", auth, searchAccount);
router.put("/change-password", auth, changePasswordValidation, validate, changePassword);
router.post("/transfer", auth, transferValidation, validate, transferMoney);
router.post("/verify-transfer", auth, transferOtpValidation, validate, verifyTransfer);

export default router;
