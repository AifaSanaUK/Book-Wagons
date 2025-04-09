const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");
const Coupon = require("../../models/couponSchema");

// ----------------------------------------------------------------------------------------------------

const applyCoupon = async (req, res) => {
  const { coupon, totalAmount } = req.body;

  if (!coupon) {
    return res.json({ success: false, message: "Coupon is missing" });
  }

  const foundCoupon = await Coupon.findOne({ name: coupon, isList: true });
  if (!foundCoupon) {
    return res.json({ success: false, message: "Invalid or expired coupon" });
  }

  if (totalAmount < foundCoupon.minimumPrice) {
    return res.json({
      success: false,
      message: `Minimum order ₹${foundCoupon.minimumPrice} required`,
    });
  }

  const discount = foundCoupon.offerPrice;
  const finalAmount = totalAmount - discount;
  req.session.coupon = { name: coupon, discount };
  res.json({ success: true, discount, finalAmount });
};
// ----------------------------------------------------------------------------------------------------

const removeCoupon = async (req, res) => {
  try {
    req.session.coupon = null;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to remove coupon" });
  }
};
// ----------------------------------------------------------------------------------------------------

module.exports = {
  applyCoupon,
  removeCoupon,
};
