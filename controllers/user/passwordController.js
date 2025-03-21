const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Banner = require("../../models/bannerSchema")
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt")
const sendOTP = require("../../utils/sendOTP");
// ------------------------------------------------------------------------------------------------------------------------------------------------------

const renderEmailVerificationPage = async (req, res) => {
    try {
        res.render("user/email");
    } catch (error) {
        res.redirect('/pageNotFOund')
    }
}
// ------------------------------------------------------------------------------------------------------------------------------------------------------

const verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found!" });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
}
// ------------------------------------------------------------------------------------------------------------------------------------------------------
const otpStorage = {};

const verifyEmailAndSendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found!" });
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStorage[email] = { otp, expires: Date.now() + 30 * 1000 };
        await sendOTP(email, otp);

        res.json({ success: true, message: "Email verified!", redirect: "/email-otp" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------------


const renderEmailOtpPage = async (req, res) => {
    try {
        res.render("user/emailotp");
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------

const validateOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const storedOTP = otpStorage[email];

        if (!storedOTP || storedOTP.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP expired! Please request again." });
        }

        if (parseInt(otp) !== storedOTP.otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP!" });
        }

        delete otpStorage[email];
        res.json({ success: true, message: "OTP verified!", redirect: "/update-password" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------------

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (otpStorage[email] && otpStorage[email].expires < Date.now()) {
            delete otpStorage[email];
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStorage[email] = { otp, expires: Date.now() + 30 * 1000 };
        await sendOTP(email, otp);

        res.json({ success: true, message: "New OTP sent!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------------


const renderUpdatePasswordPage = async (req, res) => {
    try {
        res.render("user/updatepassword");
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------------

const updatePassword = async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found!" });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password!" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
    renderEmailVerificationPage,
    verifyEmail,
    verifyEmailAndSendOTP,
    renderEmailOtpPage,
    validateOTP,
    resendOTP,
    renderUpdatePasswordPage,
    updatePassword
};

