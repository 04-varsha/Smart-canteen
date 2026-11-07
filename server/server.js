const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

for (const key of ["MONGO_URI", "JWT_SECRET", "ADMIN_USER", "ADMIN_PASS"]) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key} (see .env.example)`);
    process.exit(1);
  }
}

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
  console.log("Razorpay keys not set: online payment is switched off (see Part 5 of the guide).");

const app = express();
app.set("trust proxy", 1); // needed on Render so rate limiting sees the real IP
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));

// General limit for all API calls
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Tells the frontend whether to show the "Pay online" option
app.get("/api/config", (req, res) =>
  res.json({ onlinePayment: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) })
);

app.use("/api/menu", require("./routes/menu"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/auth", require("./routes/auth"));

// Unknown API route -> JSON 404 (instead of HTML)
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Serve the frontend
app.use(express.static(path.join(__dirname, "../client")));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`SmartCanteen running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });