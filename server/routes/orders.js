const router = require("express").Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const auth = require("../middleware/auth");

const PAYMENTS = ["Pay at counter", "UPI (demo)"];
const STATUSES = ["Placed", "Preparing", "Ready", "Completed"];

// Customer: place an order. Prices come from the database, never from the browser.
router.post("/", async (req, res, next) => {
  try {
    const { name, email, payment, items } = req.body || {};
    const cleanName = String(name || "").trim();

    if (!cleanName || cleanName.length > 50)
      return res.status(400).json({ error: "Please enter a valid name" });
    if (!/^\S+@\S+\.\S+$/.test(String(email || "")))
      return res.status(400).json({ error: "Please enter a valid email" });
    if (!PAYMENTS.includes(payment))
      return res.status(400).json({ error: "Invalid payment method" });
    if (!Array.isArray(items) || !items.length || items.length > 30)
      return res.status(400).json({ error: "Your cart is empty or too large" });

    const lines = [];
    let total = 0;
    for (const i of items) {
      const qty = parseInt(i.qty, 10);
      if (!(qty >= 1 && qty <= 20))
        return res.status(400).json({ error: "Quantity must be between 1 and 20" });
      if (!mongoose.isValidObjectId(i.id))
        return res.status(400).json({ error: "Invalid item in cart" });

      const dbItem = await MenuItem.findById(i.id);
      if (!dbItem)
        return res.status(400).json({ error: "An item in your cart is no longer available" });

      lines.push({ menuItem: dbItem._id, name: dbItem.name, price: dbItem.price, qty });
      total += dbItem.price * qty;
    }

    // Order number: SC + 7 digits of time + 3 random digits
    const number =
      "SC" + Date.now().toString().slice(-7) + crypto.randomInt(100, 1000);

    const order = await Order.create({
      number,
      name: cleanName,
      email,
      payment,
      items: lines,
      total
    });
    res.status(201).json(order);
  } catch (e) { next(e); }
});

// Staff: list recent orders (declared before /:number so "/" is not confused)
router.get("/", auth, async (req, res, next) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }).limit(100));
  } catch (e) { next(e); }
});

// Customer: look up one order by number (confirmation page)
router.get("/:number", async (req, res, next) => {
  try {
    const order = await Order.findOne({ number: String(req.params.number) });
    order ? res.json(order) : res.status(404).json({ error: "Order not found" });
  } catch (e) { next(e); }
});

// Staff: update order status
router.patch("/:id/status", auth, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: "Invalid id" });
    if (!STATUSES.includes(status))
      return res.status(400).json({ error: "Invalid status" });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    order ? res.json(order) : res.status(404).json({ error: "Order not found" });
  } catch (e) { next(e); }
});

module.exports = router;