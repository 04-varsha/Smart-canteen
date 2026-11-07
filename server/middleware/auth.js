const router = require("express").Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again in 15 minutes." }
});

// Constant-time string comparison
const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const ok =
    safeEqual(username || "", process.env.ADMIN_USER) &&
    safeEqual(password || "", process.env.ADMIN_PASS);
  if (!ok) return res.status(401).json({ error: "Wrong username or password" });

  const token = jwt.sign({ role: "staff" }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

module.exports = router;