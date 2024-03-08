const mongoose = require("mongoose");
const PasswordResetSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId type for user_id
    ref: "User", // Reference the User model
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
});

module.exports = new mongoose.model("PasswordReset", PasswordResetSchema);
