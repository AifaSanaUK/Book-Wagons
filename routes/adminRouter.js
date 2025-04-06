const express = require("express");
const multer = require('multer');
const path = require("path")
const router = express.Router();
const flash = require('connect-flash');
const adminController = require("../controllers/admin/adminController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController")
const bannerController = require("../controllers/admin/bannerController")
const orderController = require('../controllers/admin/orderController')
const coupenController = require('../controllers/admin/coupenController')
const walletController = require('../controllers/admin/walletController')
const refferalController = require('../controllers/admin/refferalController')
const dashboardController = require('../controllers/admin/dashboardController')
const { upload, uploadBanner } = require("../middlewares/multer")
router.use(flash());

// -------------------------------------------------------------------------------------------------------------------------------
// Error Page
router.get("/pageerror", adminController.pageerror);


// -------------------------------------------------------------------------------------------------------------------------------

// Authentication Routes
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);

router.get('/logout', adminController.logout);
// -------------------------------------------------------------------------------------------------------------------------------

// Customer Routes
router.get("/customers", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);
// -------------------------------------------------------------------------------------------------------------------------------

// Category Routes
router.get("/category", adminAuth, categoryController.categoryInfo);
router.get("/getCategory", adminAuth, categoryController.fetchCategories);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.put("/toggleCategoryStatus", adminAuth, categoryController.toggleCategoryStatus);
router.delete("/deleteCategory", adminAuth, categoryController.deleteCategory);
router.put("/editCategory/:id", adminAuth, categoryController.updateCategory);
router.get("/editCategory/:id", adminAuth, categoryController.editCategory);
// -------------------------------------------------------------------------------------------------------------------------------

// list
router.put("/listCategory", adminAuth, categoryController.listCategory);
router.put("/unlistCategory", adminAuth, categoryController.unlistCategory);
// -------------------------------------------------------------------------------------------------------------------------------

// Offer Routes
router.put("/setOffer/:id", adminAuth, categoryController.setOffer);
router.put("/removeOffer/:id", adminAuth, categoryController.removeOffer);
// -------------------------------------------------------------------------------------------------------------------------------

router.get("/addProducts", adminAuth, productController.getProductsPage)
router.post("/addProducts", adminAuth, upload, productController.addProducts);



router.get("/products", adminAuth, productController.getAllproducts)
router.post("/addProductOffer", adminAuth, productController.addOffer);
router.post("/removeProductOffer", adminAuth, productController.removeOffer);
router.post('/blockProduct', adminAuth, productController.blockProduct)
router.post('/unblockProduct', adminAuth, productController.unblockProduct)
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.post('/editProduct/:id', adminAuth, upload, productController.editProduct)
router.delete('/deleteProduct', adminAuth, productController.deleteProduct)
router.delete('/deleteImage/:productId/:imageName', adminAuth, productController.deleteSingleImage);

// banner-----------------------------------------------------------------------------------

router.get("/banner", adminAuth, bannerController.getBannerPage)
router.get('/addBanner', adminAuth, bannerController.getAddBannerPage)
router.post('/addBanner', adminAuth, uploadBanner, bannerController.addBanner)
router.get('/deleteBanner', adminAuth, bannerController.deleteBanner)

// ----------------------------------------------------------------------------
router.get('/orders', adminAuth, orderController.getOrders);
router.post('/orders/update-status', orderController.updateOrderStatus);
router.post('/orders/verify-return', adminAuth, orderController.verifyReturnRequest);
router.put("/orders/approve-return", adminAuth, orderController.approveReturnRequest);
// ----------------------------------------------------------------------------------------------------------------------------------

router.get('/orders/search', adminAuth, orderController.searchOrders);
router.get("/orders/:orderId", adminAuth, orderController.viewDetails);
router.get('/order/cancel-reason/:orderId', adminAuth, orderController.getCancelReason)
router.get("/stock-management", adminAuth, orderController.viewStock);
router.post("/update-stock/:productId", adminAuth, orderController.updateStock);
// ----------------------------------------------------------------------------------------------------------------------------------

router.get('/coupon', adminAuth, coupenController.loadCoupon)
router.post('/coupon', adminAuth, coupenController.createCoupon)
router.get('/coupon/:id', adminAuth, coupenController.editCoupon)
router.put('/coupon/:id', adminAuth, coupenController.updateCoupon)
router.delete('/coupon/:id', adminAuth, coupenController.deleteCoupon)


router.get("/sales-report", adminAuth, orderController.getSalesReport);
router.get("/sales-report/pdf", adminAuth, orderController.downloadPDF);
router.get("/sales-report/excel", adminAuth, orderController.downloadExcel);

router.get("/wallet-transactions", adminAuth, walletController.getWalletTransactions);
router.get("/wallet-transaction/:userId/:transactionId", adminAuth, walletController.getTransactionDetails);
router.get('/order/:orderId', adminAuth, walletController.getOrderDetails);

router.get("/referral-offers", adminAuth, refferalController.getReferralOffers);
router.get("/user/:id", adminAuth, refferalController.getUserWithReferrer);
router.get("/customers", adminAuth, refferalController.getUsersWithReferral);


router.get("/dashboard", adminAuth, dashboardController.loadDashboard);
router.get('/api/dashboard-data', adminAuth, dashboardController.loadDashboardData);


module.exports = router;

