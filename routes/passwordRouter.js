const express = require("express");
const router = express.Router();
const passwordController = require("../controllers/user/passwordController")

// --------------------------------------------------------------------

router.get("/update-password", passwordController.renderUpdatePasswordPage);
router.post("/update-password", passwordController.updatePassword);


module.exports = router;
