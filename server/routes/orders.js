const router = require("express").Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const auth = require("../middleware/auth");

const PAYMENTS = ["Pay at counter", "Pay online"];
const STATUSES = ["Placed", "Preparing", "Ready", "Completed"];

// Online payment works only when both Razorpay keys are set in .env
const razorpayEnabled = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

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
    if (payment === "Pay online" && !razorpayEnabled())
      return res.status(400).json({ error: "Online payment is not available right now" });
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
    const number = "SC" + Date.now().toString().slice(-7) + crypto.randomInt(100, 1000);

    const order = await Order.create({
      number,
      name: cleanName,
      email,
      payment,
      items: lines,
      total
    });

    if (payment === "Pay at counter") return res.status(201).json({ order });

    // Pay online: create a matching order on Razorpay. Its amount is in paise (1 rupee = 100 paise).
    try {
      const rzpOrder = await getRazorpay().orders.create({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: number
      });
      order.razorpayOrderId = rzpOrder.id;
      await order.save();
      return res.status(201).json({
        order,
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID, // the key id is public; the secret never leaves the server
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency
        }
      });
    } catch (e) {
      console.error("Razorpay order creation failed:", e);
      await Order.deleteOne({ _id: order._id });
      return res.status(502).json({ error: "Could not start online payment. Please try again or pay at the counter." });
    }
  } catch (e) { next(e); }
});

// Customer: after Razorpay says "paid", prove it. The server recomputes the signature with the secret key.
router.post("/:number/verify-payment", async (req, res, next) => {
  try {
    if (!razorpayEnabled())
      return res.status(400).json({ error: "Online payment is not available" });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const order = await Order.findOne({ number: String(req.params.number) });
    if (!order || !order.razorpayOrderId)
      return res.status(404).json({ error: "Order not found" });
    if (order.paymentStatus === "Paid") return res.json(order); // already verified
    if (razorpay_order_id !== order.razorpayOrderId)
      return res.status(400).json({ error: "Payment does not match this order" });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(order.razorpayOrderId + "|" + String(razorpay_payment_id))
      .digest("hex");
    const given = String(razorpay_signature || "");
    const valid =
      expected.length === given.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
    if (!valid) return res.status(400).json({ error: "Payment verification failed" });

    order.paymentStatus = "Paid";
    order.razorpayPaymentId = String(razorpay_payment_id);
    await order.save();
    res.json(order);
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