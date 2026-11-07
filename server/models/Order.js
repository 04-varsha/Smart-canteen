const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    payment: { type: String, enum: ["Pay at counter", "Pay online"], required: true },
    paymentStatus: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    items: [
      {
        menuItem: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        qty: Number
      }
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Placed", "Preparing", "Ready", "Completed"],
      default: "Placed"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
