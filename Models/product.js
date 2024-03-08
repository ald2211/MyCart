const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  images: {
    type: Array,
    required: true,
  },
  discount: {
    type: String,
  },
  stock: {
    type: Number,
    min: 0,
    max: 255,
    default: 0,
  },
  stockStatus: {
    type: String,
    default: "Out of Stock",
  },
  rating: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  publisher: {
    type: String,
    required: true,
  },
  publishedDate: {
    type: Date,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  pages: {
    type: Number,
  },
  categoryStatus: {
    type: Boolean,
    default: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  softDelete: {
    type: Boolean,
    default: false,
  },
  productOffer: {
    type: Number,
  },
  offerStatus: {
    type: Boolean,
    required: true,
    default: false,
  },
  ProductDiscountedPrice: {
    type: Number,
  },
  CategoryDiscountedPrice: {
    type: Number,
  },
  finalisedPrice: {
    type: Number,
  },
});
module.exports = new mongoose.model("product", productSchema);
