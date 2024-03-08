const mongoose = require("mongoose");
const referralSchema = new mongoose.Schema({
  newUserBonus: {
    type: Number,
    required: true,
    default: 0,
  },
  referredUserBonus: {
    type: Number,
    required: true,
    default: 0,
  },
});

module.exports = new mongoose.model("referral", referralSchema);
