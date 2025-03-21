const express = require("express");
const router = express.Router();
const passwordController = require("../controllers/user/passwordController")

// --------------------------------------------------------------------
router.get("/change-password", passwordController.renderEmailVerificationPage);
router.post("/email-verify", passwordController.verifyEmailAndSendOTP);
router.post("/otp-verify", passwordController.validateOTP);
router.post("/otp-resend", passwordController.resendOTP);
router.get("/email-otp", passwordController.renderEmailOtpPage);
router.get("/update-password", passwordController.renderUpdatePasswordPage);
router.post("/update-password", passwordController.updatePassword);


module.exports = router;
