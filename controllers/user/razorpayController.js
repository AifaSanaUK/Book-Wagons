const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
// ----------------------------------------------------------------------------------------------------

const generateOrderID = () => {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// ----------------------------------------------------------------------------------------------------

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ----------------------------------------------------------------------------------------------------

const createOrder = async (req, res) => {
  try {
    const { amount, selectedAddressId } = req.body;
    if (!amount || !selectedAddressId) {
      return res
        .status(400)
        .json({ success: false, message: "Amount and Address are required" });
    }



    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);


    const addressDoc = await Address.findOne({ userId: req.session.user });
    if (!addressDoc) throw new Error("Address not found");

    const address = addressDoc.address.find(
      (addr) => addr._id.toString() === selectedAddressId,
    );
    if (!address) throw new Error("Selected address not found");

    const newOrder = new Order({
      orderId: generateOrderID(),
      razorpayOrderId: order.id,
      user: req.session.user,
      totalPrice: amount,
      finalAmount: amount,
      status: "Pending",
      address: address._id,
    });

    await newOrder.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create Razorpay order" });
  }
};

// ----------------------------------------------------------------------------------------------------

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      selectedAddressId,
    } = req.body;
    const userId = req.session.user;
    const paymentMethod = "Razorpay";


    if (!req.session.paymentData) {
      return res
        .status(400)
        .json({ success: false, message: "No payment data found" });
    }

    const { totalAmount, finalAmount, items } = req.session.paymentData;

    const crypto = require("crypto");
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.log(" Payment verification failed due to signature mismatch");
      return res.redirect(`/payment/order-failure`);
    }



    const user = await User.findById(userId);
    const addressDoc = await Address.findOne({ userId: userId });
    if (!addressDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const address = addressDoc.address.find(
      (addr) => addr._id.toString() === selectedAddressId,
    );
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Selected address not found" });
    }

    const existingOrder = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    });
    if (!existingOrder) {
      return res.redirect(`/payment/order-failure`);
    }

    existingOrder.orderedItems = items.map((item) => ({
      product: item.productId,
      quantity: Number(item.quantity),
      price: Number(item.price.replace(/\D/g, "")),
    }));
    existingOrder.totalPrice = totalAmount;
    existingOrder.finalAmount = finalAmount;
    existingOrder.paymentMethod = paymentMethod;
    existingOrder.status = "Pending";
    existingOrder.razorpayPaymentId = razorpay_payment_id;

    await existingOrder.save();

    try {
      for (const item of existingOrder.orderedItems) {
        console.log(`Processing product ID: ${item.product}`);
        const product = await Product.findById(item.product);
        if (!product) {
          console.log(` Product not found for ID: ${item.product}`);
          continue;
        }

        product.quantity -= item.quantity;
        if (product.quantity < 1) {
          product.status = "Out of Stock";
        }
        await product.save();
        console.log(
          ` Stock updated for product ${product.name} - Remaining: ${product.quantity}`,
        );
      }

      await Cart.deleteMany({ userId: userId });

      return res.status(200).json({
        success: true,
        userName: user.name,
        orderId: existingOrder.orderId,
      });
    } catch (error) {
      console.error(" Error updating stock:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error updating stock" });
    }
  } catch (error) {
    console.error(" Error verifying payment:", error);
    if (res.headersSent) {
      console.log(" Headers already sent. Skipping response.");
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
};

// ----------------------------------------------------------------------------------------------------
const fail = async (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.redirect("/orders");
  }

  try {
    const order = await Order.findOne({ razorpayOrderId: orderId }).populate({
      path: "orderedItems.product",
      select: "productName productImage",
    });

    if (!order) {
      console.log("Order not found for Razorpay ID:", orderId);
      return res.redirect("/orders");
    }

    if (!order.orderedItems || order.orderedItems.length === 0) {
      console.log("Restoring ordered items for failed order");
      order.orderedItems = req.session.paymentData.items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: Number(item.price.replace(/\D/g, "")),
      }));
    }

    order.status = "Failed";
    order.paymentStatus = "Failed";
    order.paymentMethod = "Razorpay";
    await order.save();



    res.render("user/paymentfailed", {
      orders: order,
      title: "Order Transaction Failed",
      message: "Your transaction was unsuccessful.",
      illustration: "/images/payment-failed.jpg",
      orderId: order.orderId,
      totalAmount: order.finalAmount,
      items: order.orderedItems.map((item) => ({
        name: item.product ? item.product.productName : "Unknown Product",
        image:
          item.product &&
            item.product.productImage &&
            item.product.productImage.length > 0
            ? item.product.productImage[0]
            : "/images/default-product.png",
        quantity: item.quantity,
        price: item.price,
      })),
    });
  } catch (error) {
    console.error("Error updating failed order:", error);
    res.redirect("/shop");
  }
};
// -------------------------------------------------------------------------------------------------------------------
const retryPayment = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res
      .status(400)
      .json({ success: false, message: "Order ID is required." });
  }

  try {
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }



    if (!order.finalAmount) {
      return res
        .status(400)
        .json({ success: false, message: "Order amount is missing." });
    }

    const options = {
      amount: order.finalAmount * 100,
      currency: "INR",
      receipt: `retry_${orderId}`,
    };



    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const newOrder = await razorpay.orders.create(options);


    res.json({
      success: true,
      paymentPage: `/payment?orderId=${orderId}`,
    });
  } catch (error) {
    console.error("Error during retry payment:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
// ----------------------------------------------------------------------------------------------------

const orderDetails = async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return res.status(404).render("error", { message: "Order not found" });
    }
    res.render("user/orderFailedDetails", { order });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", { message: "Server error" });
  }
};

// ----------------------------------------------------------------------------------------------------

module.exports = {
  createOrder,
  verifyPayment,
  fail,
  retryPayment,
  orderDetails,
};
