const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Banner = require("../../models/bannerSchema")
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt")
const sendOTP = require("../../utils/sendOTP");
// ------------------------------------------------------------------------------------------------------------------------------------------------------
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

        const userSession = req.session.user;

        if (!userSession) {
            return res.status(400).json({ success: false, message: "User not logged in!" });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }


        const user = await User.findById(userSession._id);
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
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {

    renderUpdatePasswordPage,
    updatePassword
};

