require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const adminRoutes = require("./routes/adminRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const botRoutes = require("./routes/botRoutes");
const chatRoutes = require("./routes/chatRoutes");
const sosRoutes = require("./routes/sosRoutes");

const app = express();

app.use(cors({
  origin: [
    'https://scholar-hub-seven.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/sos", sosRoutes);

app.get("/", (req, res) => {
  res.json({ message: "ScholarHub API is running" });
});

const PORT = process.env.PORT || 8080;

console.log("Starting server...");
console.log("PORT:", PORT);
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });