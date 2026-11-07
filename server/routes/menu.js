const router = require("express").Router();
const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const auth = require("../middleware/auth");

// Pick only the fields we allow, so clients can't inject anything else
const clean = (body = {}) => ({
  name: body.name,
  price: body.price,
  category: body.category,
  emoji: (body.emoji || "").trim() || "🍽️"
});

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : res.status(400).json({ error: "Invalid id" });

// Public: list menu
router.get("/", async (req, res, next) => {
  try {
    res.json(await MenuItem.find().sort({ _id: 1 }));
  } catch (e) { next(e); }
});

// Staff: add item
router.post("/", auth, async (req, res) => {
  try {
    res.status(201).json(await MenuItem.create(clean(req.body)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Staff: update item
router.put("/:id", auth, validId, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, clean(req.body), {
      new: true,
      runValidators: true
    });
    item ? res.json(item) : res.status(404).json({ error: "Item not found" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Staff: delete item
router.delete("/:id", auth, validId, async (req, res, next) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;