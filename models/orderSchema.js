const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");
const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  address: {
    type: Schema.Types.ObjectId,

    required: true,
  },
  invoiceDate: {
    type: Date,
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Shipped",
      "Failed",
      "Delivered",
      "Cancelled",
      "Return Requested",
      "Return Approved",
      "Return Rejected",
    ],
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponCode: {
    type: String,
    default: null,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  deliveryCharge: { type: Number, default: 50 },

  paymentMethod: {
    type: String,
    required: true,

    enum: [
      "cod",
      "Razorpay",
      "Credit Card",
      "Debit Card",
      "UPI",
      "Net Banking",
      "wallet",
    ],
    default: "cod",
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  cancelReason: {
    type: String,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  returnReason: {
    type: String,
    default: null,
  },
  returnRequestedAt: {
    type: Date,
    default: null,
  },
});
const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
