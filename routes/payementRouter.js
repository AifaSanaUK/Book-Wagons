const express = require("express");
const router = express.Router();
const razorpayController = require("../controllers/user/razorpayController");

router.post("/create-order", razorpayController.createOrder);

router.post("/verify-payment", razorpayController.verifyPayment);
router.get("/order-failure", razorpayController.fail);

router.post("/retry-payment/:orderId", razorpayController.retryPayment);
router.get("/order-details/:orderId", razorpayController.orderDetails);

module.exports = router;
