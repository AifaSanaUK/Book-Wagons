const express = require('express');
const router = express.Router();
const orderController = require('../controllers/user/orderController');
const walletController = require('../controllers/user/walletController')
const coupenController = require("../controllers/user/couponController")
const { userAuth, adminAuth } = require("../middlewares/auth");




router.get("/checkout", userAuth, orderController.renderCheckoutPage);
// -------------------------------------------------------------------------------------------------------

router.post("/add-address", userAuth, orderController.newAddress)
router.put("/edit-address/:addressId", userAuth, orderController.EditAddress)
router.delete("/delete-address/:addressId", userAuth, orderController.DeleteAddress);
// -------------------------------------------------------------------------------------------------------

router.post('/proceed-to-payment', userAuth, orderController.proceedPayment)
router.get('/payment', userAuth, orderController.payment)
router.get('/get-payment-data', userAuth, orderController.getPaymentData);
// -------------------------------------------------------------------------------------------------------

router.post("/place-order", userAuth, orderController.orderPlaced)
router.get("/order-success", (req, res) => {
    const { userName, orderId } = req.query;
    res.render('user/orderplaced', { userName, orderId });
});

router.get('/orders/:orderId', userAuth, orderController.orderDetails)
router.post('/cancel-order/:orderId', userAuth, orderController.orderCancel)
router.post('/return-order', userAuth, orderController.orderReturn)
router.get('/order', userAuth, orderController.getUserOrders)
router.get("/order/tracking/:orderId", userAuth, orderController.orderTracking);
router.get('/search-order', userAuth, orderController.searchOrders)
// -------------------------------------------------------------------------------------------------------

router.get('/generate-invoice/:orderId', userAuth, orderController.generateInvoice);
// -------------------------------------------------------------------------------------------------------


router.get('/wallet', userAuth, walletController.wallet)
router.get("/wallet/:userId", userAuth, walletController.getData);


router.post('/apply-coupon', userAuth, coupenController.applyCoupon)
router.post('/remove-coupon', userAuth, coupenController.removeCoupon)

module.exports = router;



