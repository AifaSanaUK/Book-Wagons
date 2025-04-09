const mongoose = require("mongoose");
const { Schema } = mongoose;
const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },

  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiryOn: {
    type: Date,
    required: true,
  },
  offerPrice: {
    type: Number,
    required: true,
  },
  isList: {
    type: Boolean,
    default: true,
  },
  minimumPrice: {
    type: Number,
    required: true,
  },
  isReferral: { type: Boolean, default: false }, // Identify referral-based coupons
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  userId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
