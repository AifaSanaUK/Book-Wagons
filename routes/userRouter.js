const express = require("express");
const router = express.Router()
const userController = require("../controllers/user/userController");
const passport = require("passport");
const productController = require("../controllers/user/productController")
const profileController = require("../controllers/user/profileController");
const { userAuth } = require("../middlewares/auth");
const cartController = require("../controllers/user/cartController")
const wishlistController = require("../controllers/user/wishlistController")
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------


router.get('/pageNotFound', userController.pageNotFound)
router.get('/', userController.loadHomepage)
router.get('/shop', userController.loadShoppingPage)
router.get('/filter', userController.filterProduct)
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

router.get("/signup", userController.loadSignupPage)
router.post('/signup', userController.signup)
router.get("/verifyotp", userController.loadVerifyOtpPage)
router.post("/resendotp", userController.resendOtp);
router.post("/verifyotp", userController.verifyOtp)
router.get("/auth/google", passport.authenticate('google', { scope: ["profile", "email"] }));
router.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/signup" }),
    (req, res) => {
        req.session.user = req.user;
        res.redirect("/");
    }
);

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

router.get("/login", userController.loadLogin)
router.post("/login", userController.login)
router.get("/logoutt", userController.logout)
router.post("/logoutt", userController.logout)
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------


router.get('/forgetpassword', profileController.getForgetPassPage)
router.post('/forget-email-valid', profileController.forgetEmailValid)
router.get("/verify-otp", profileController.verifyOOtp);
router.post("/verify-otp", profileController.verifyOOtp);
router.get("/forgetpassOtp", profileController.OtpPage);
router.post('/resend-otp', profileController.resendOtp)
router.post('/validate-otp', profileController.validateOtp)
router.get('/reset-password', profileController.resetpassword)
router.post('/reset-password', profileController.postResetPassword)
router.get('/userProfile', userAuth, profileController.userProfile)

router.post('/update-profile', userAuth, profileController.updateProfile)
router.get('/changeemail', userAuth, profileController.changeEmail)
router.post('/changeemail', userAuth, profileController.changeEmailValid)
router.get('/changeemailotp', userAuth, profileController.renderChangeEmailOtp);
router.post('/resend-email-otp', userAuth, profileController.resendEmailOtp);

router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp)
router.get('/update-email', userAuth, profileController.updateEmail)
router.post('/update-email', userAuth, profileController.updateEmail)
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

router.get('/addressButton', userAuth, profileController.addressButton)

router.get('/addAddress', userAuth, profileController.addAddress)
router.post('/addAddress', userAuth, profileController.postAddAddress)
router.get("/getAddress/:id", userAuth, profileController.getAddress)
router.put("/updateAddress/:id", userAuth, profileController.updateAddress)
router.delete("/deleteAddress/:id", userAuth, profileController.deleteAddress)

// ---------------------------------------------------------------
router.get('/productDetails', userAuth, productController.productDetails)
router.get('/api/products', userAuth, userController.searchSortFilterProducts);


// -----------------------------------------------------------
router.get('/cart', userAuth, cartController.renderCart);
router.post('/add-to-cart', userAuth, cartController.addToCart);
router.post('/remove-from-cart', userAuth, cartController.removeFromCart);
router.get('/get-cart/:userId', userAuth, cartController.getCart);
router.post('/update-cart-item', userAuth, cartController.updateCartItem);
router.get('/get-product/:productId', userAuth, cartController.getProduct)
// ----------------------------------------------------------------------------------------------------------------------------------

router.get('/wishlist', userAuth, wishlistController.loadWishlist)
router.post('/wishlist/add', userAuth, wishlistController.addToWishlist);
router.post('/remove-from-wishlist', userAuth, wishlistController.removeFromWishlist);
router.get('/get-wishlist/:userId', userAuth, wishlistController.getWishlist);
router.get("/cart-summary/:userId", userAuth, cartController.getCartSummary);



module.exports = router 
