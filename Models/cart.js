const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId type for user_id
    ref: "User", // Reference the User model
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
        default: 0, // Set a default value
      },
    },
  ],
});

module.exports = new mongoose.model("cart", cartSchema);
