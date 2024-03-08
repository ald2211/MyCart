const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product", // Reference the Product model
        required: true,
      },
      quantity: {
        type: Number,
        default: 0, // Set a default value if needed
      },
    },
  ],
  paymentStatus: {
    type: String,
    default: "pending",
  },
  orderPaymentStatus: {
    type: String,
    default: "pending",
  },
  name: {
    type: String,
    requried: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  pincode: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  cancelledDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    requried: true,
  },
  returnStatus: {
    type: Boolean,
    default: false,
  },
  returnReason: {
    type: String,
  },
  fixedShipingCharge: {
    type: Number,
  },
  coupenDiscount: {
    type: Number,
  },
});

module.exports = new mongoose.model("order", orderSchema);
