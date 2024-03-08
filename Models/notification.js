const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId type for user_id
    ref: "User", // Reference the User model
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const notifications = new mongoose.model("notifications", notificationSchema);
module.exports = notifications;
