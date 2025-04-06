const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema")
const Order = require('../../models/orderSchema')

// ------------------------------------------------------------------------------------------------------------------------

const getReferralOffers = async (req, res) => {
    try {
        const users = await User.find()
            .populate("referredBy", "name email")
            .select("name email referralCode referredBy referralExpiry referralReward");

        res.render("admin/ref", { offers: users });
    } catch (error) {
        console.error("Error fetching referral offers:", error);
        res.status(500).send("Server error");
    }
};
// ------------------------------------------------------------------------------------------------------------------------


const getUserWithReferrer = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId).populate("referredBy", "name email");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                referredBy: user.referredBy ? user.referredBy.name : "No referrer"
            }
        });
    } catch (error) {
        console.error("Error fetching user with referrer:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// ------------------------------------------------------------------------------------------------------------------------

const getUsersWithReferral = async (req, res) => {
    try {
        const users = await User.find().populate("referredBy", "name");
        res.render("admin/refferalOfferss", { users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
};
// ------------------------------------------------------------------------------------------------------------------------

module.exports = {
    getReferralOffers,
    getUserWithReferrer,
    getUsersWithReferral
}