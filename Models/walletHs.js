const mongoose = require("mongoose");
const walletHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
  },
  transactionType: {
    type: String,
  },
  amount: {
    type: Number,
  },
});

module.exports = new mongoose.model("walletHs", walletHistorySchema);
