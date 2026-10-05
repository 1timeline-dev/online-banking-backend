import express from "express";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { uploadProfileImage } from "../controllers/uploadController.js";

const router = express.Router();

router.post(
  "/profile-image",
  auth,
  upload.single("image"),
  uploadProfileImage
);

export default router;