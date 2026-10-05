import express from "express";
import auth from "../middleware/auth.js";
import {
  addBeneficiary,
  getBeneficiaries,
  deleteBeneficiary,
} from "../controllers/beneficiaryController.js";

const router = express.Router();

router.post("/", auth, addBeneficiary);
router.get("/", auth, getBeneficiaries);
router.delete("/:id", auth, deleteBeneficiary);

export default router;