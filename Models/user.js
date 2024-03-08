const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    requried: true,
  },
  email: {
    type: String,
  },
  number: {
    type: Number,
  },
  password: {
    type: String,
  },
  profileImage: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  appliedCoupons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coupen",
    },
  ],
  Referalcode: {
    type: String,
  },
  referalUsed: {
    type: Boolean,
    required: true,
    default: false,
  },
  Userwallet: {
    type: Number,
    required: true,
    default: 0,
  },
  gmail: {
    type: String,
  },
  Bonus: {
    type: Number,
  },
});
module.exports = new mongoose.model("User", userSchema);
