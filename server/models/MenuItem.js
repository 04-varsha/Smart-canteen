const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 45 },
  price: { type: Number, required: true, min: 1, max: 10000 },
  category: { type: String, enum: ["Meals", "Snacks", "Drinks"], required: true },
  emoji: { type: String, default: "🍽️", maxlength: 8 }
});

module.exports = mongoose.model("MenuItem", menuItemSchema);