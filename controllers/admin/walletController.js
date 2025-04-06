const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema")
const Order = require('../../models/orderSchema')


const getWalletTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;


        const users = await User.find({ "transactions.0": { $exists: true } })
            .select("name email transactions");


        let allTransactions = [];
        users.forEach(user => {
            user.transactions.forEach(txn => {
                allTransactions.push({
                    userId: user._id,
                    userName: user.name,
                    userEmail: user.email,
                    transactionId: txn._id,
                    date: txn.date,
                    amount: txn.amount,
                    type: txn.type,
                    description: txn.description,
                });
            });
        });


        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));


        const totalTransactions = allTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const transactions = allTransactions.slice(skip, skip + limit);

        res.render("admin/adminWallet", {
            transactions,
            currentPage: page,
            totalPages,
            totalTransactions
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};
// -------------------------------------------------------------------------------------------------------

const getTransactionDetails = async (req, res) => {
    try {
        const { userId, transactionId } = req.params;
        const user = await User.findById(userId).select("name email transactions");

        if (!user) {
            return res.status(404).send("User not found");
        }

        const transaction = user.transactions.id(transactionId);
        if (!transaction) {
            return res.status(404).send("Transaction not found");
        }

        res.render("admin/adminWalletDetails", { user, transaction });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};
// -------------------------------------------------------------------------------------------------------

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;


        const order = await Order.findById(orderId)
            .select('orderId paymentMethod status finalAmount discount couponCode orderedItems')
            .populate('orderedItems.product', 'productName productImage')
            .lean();

        if (!order) {
            return res.status(404).render("admin/pageerror", { message: "Order not found" });
        }

        res.render('admin/walletPerDetails', { order });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// -------------------------------------------------------------------------------------------------------


module.exports = {
    getTransactionDetails,
    getWalletTransactions,
    getOrderDetails
}