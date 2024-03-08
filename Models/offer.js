const mongoose = require("mongoose");
const offerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
  discount_percentage: {
    type: Number,
    required: true,
    default: 0,
  },
  offer_type: {
    type: String,
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product", // Reference the Product model
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category", // Reference the category model
  },
});

module.exports = new mongoose.model("offer", offerSchema);
