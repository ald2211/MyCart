const mongoose = require("mongoose");
const chargeSchema = new mongoose.Schema({
  minimumAmount: {
    type: Number,
    default: 0,
  },
  fixedDeliveryCharge: {
    type: Number,
    default: 0,
  },
});

module.exports = new mongoose.model("charge", chargeSchema);
