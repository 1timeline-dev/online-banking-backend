import express from "express";
import auth from "../middleware/auth.js";
import { generateStatement } from "../controllers/statementController.js";

const router = express.Router();

router.get("/", auth, generateStatement);

export default router;