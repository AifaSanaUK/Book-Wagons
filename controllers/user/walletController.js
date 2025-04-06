const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema")
const Order = require('../../models/orderSchema')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const mongoose = require("mongoose");
// ----------------------------------------------------------------------------------------------------------------------------------

const wallet = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect("/login");
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const transactions = user.transactions.sort((a, b) => b.date - a.date);
        const paginatedTransactions = transactions.slice(startIndex, endIndex);
        const totalPages = Math.ceil(transactions.length / limit);

        res.render("user/wallet", {
            walletBalance: user.wallet.toFixed(2),
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        res.status(500).send("Internal Server Error");
    }
};

// -------------------------------------------------------------------------------------------------------------------------------


const getData = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ balance: 0, transactions: [] });
        }

        res.json({
            balance: user.wallet,
            transactions: user.transactions.sort((a, b) => b.date - a.date) || []
        });
    } catch (error) {
        console.error("Error fetching wallet data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


// ----------------------------------------------------------------------------------------------------------------------------------

module.exports = {
    wallet,
    getData
}