import express from "express";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

import {
  getAllUsers,
  getUserById,
  getUserTransactions,
  getAllTransactions,
  getDashboard,
  freezeUser,
  unfreezeUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", auth, admin, getAllUsers);
router.get("/user/:id", auth, admin, getUserById);
router.get("/user/:id/transactions", auth, admin, getUserTransactions);
router.get("/transactions", auth, admin, getAllTransactions);
router.get("/dashboard", auth, admin, getDashboard);
router.patch("/freeze/:id", auth, admin, freezeUser);
router.patch("/unfreeze/:id", auth, admin, unfreezeUser);
export default router;