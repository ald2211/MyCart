const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: Boolean,
  },
  categoryOffer: {
    type: Number,
  },
  offerStatus: {
    type: Boolean,
    required: true,
    default: false,
  },
});
module.exports = new mongoose.model("category", categorySchema);
