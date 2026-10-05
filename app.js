import "dotenv/config";
import express from "express";
import cors from "cors";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import statementRoutes from "./src/routes/statementRoutes.js";
import beneficiaryRoutes from "./src/routes/beneficiaryRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import publicRoutes from "./src/routes/publicRoutes.js";

// ================= CONNECT TO MONGODB =================

await connectDB();

const app = express();

// ================= CORS =================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://banking-frontend-bay.vercel.app",
  "https://banking-frontend-bay.vercel.app",
];

// Add process.env.CLIENT_URL if defined (supports comma-separated list)
if (process.env.CLIENT_URL) {
  const envOrigins = process.env.CLIENT_URL.split(",").map((url) =>
    url.trim().replace(/\/$/, "")
  );
  envOrigins.forEach((url) => {
    if (url && !allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });
}

console.log("CLIENT_URL env:", process.env.CLIENT_URL);
console.log("Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header (Postman, curl, server-to-server, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin)) {
      console.log("✅ CORS allowed:", origin);
      return callback(null, true);
    }

    console.warn("⚠️ CORS blocked origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ================= MIDDLEWARE =================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Online Banking API is running 🚀",
  });
});

// ================= ROUTES =================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user/statement", statementRoutes);
app.use("/api/user/beneficiaries", beneficiaryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/public", publicRoutes);

// ================= 404 =================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ================= ERROR HANDLER =================

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.message);

  if (err.message?.includes("not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS error: origin not allowed",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});