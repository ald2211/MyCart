const mongoose = require("mongoose");
const bannerSchema = new mongoose.Schema({
  bannerImg: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = new mongoose.model("banner", bannerSchema);
