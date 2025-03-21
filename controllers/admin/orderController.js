const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema")
const Order = require('../../models/orderSchema')

// --------------------------------------------------------------------------------------------------------------------
const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 6, sort = 'createdOn', order = 'desc', search = '', status = '' } = req.query;

        let query = {};
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }
        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate("user", "name email")
            .populate({
                path: "orderedItems.product",
                select: "name price",
            })
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const totalOrders = await Order.countDocuments(query);

        res.render('admin/order', {
            orders,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),
            search,
            status,
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server Error');
    }
};



// -----------------------------------------------------------------------------------------------------------------------
const searchOrders = async (req, res) => {
    try {
        const { query } = req.query;
        const orders = await Order.find({ orderID: { $regex: query, $options: 'i' } });

        res.json(orders);
    } catch (error) {
        console.error('Error searching orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// -----------------------------------------------------------------------------------------------------------------------

const viewDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate({
                path: "orderedItems.product",
                select: "productName regularPrice salePrice productImage"
            })
            .populate("user", "name email")
            .populate("address")
            .exec();

        if (!order) {
            return res.status(404).send("Order not found");
        }

        console.log("Fetched Order:", order);

        res.render("admin/ordersDetails", { order });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

// -----------------------------------------------------------------------------------------------------------------------

const updateOrderStatus = async (req, res) => {
    try {
        console.log('Received request:', req.body);

        const { orderId, status } = req.body;
        if (!orderId || !status) {
            req.flash('error', 'Invalid request');
            return res.redirect('/admin/orders');
        }

        await Order.findByIdAndUpdate(orderId, { status });

        req.flash('success', 'Order status updated');
        res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
        console.error('Error updating order:', error);
        req.flash('error', 'Failed to update order status');
        res.redirect(`/admin/orders/${orderId}`);
    }
};


// -----------------------------------------------------------------------------------------------------------------------



const verifyReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId).populate('user');

        if (!order || order.status !== "Return Requested") {
            req.flash('error', 'Invalid return request');
            return res.redirect('/admin/orders');
        }

        const user = await User.findById(order.user._id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/orders');
        }


        user.wallet += order.finalAmount;
        user.transactions.push({
            amount: order.finalAmount,
            type: "credit",
            description: `Refund for Order ${order.orderId}`,
            date: new Date()
        });

        await user.save();

        order.status = "Returned";
        await order.save();

        req.flash('success', 'Return verified and refunded to wallet');
        res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to process return');
        res.redirect(`/admin/orders/${orderId}`);
    }
};

// -----------------------------------------------------------------------------------------------------------------------


const approveReturnRequest = async (req, res) => {
    const { orderId, decision } = req.body;

    try {
        const order = await Order.findById(orderId).populate("user");
        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }

        if (order.status !== "Return Requested") {
            return res.json({ success: false, message: "No pending return request." });
        }

        const user = await User.findById(order.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (decision === "Approved") {

            order.status = "Return Approved";

            user.wallet += order.finalAmount;
            user.transactions.push({
                amount: order.finalAmount,
                type: "credit",
                description: `Refund for Order ${order.orderId}`,
                date: new Date()
            });


            for (const item of order.orderedItems) {
                let product = await Product.findById(item.product);
                if (product) {
                    product.quantity += item.quantity;
                    product.status = "Available";
                    await product.save();
                }
            }


            await user.save();
        } else {

            order.status = "Return Rejected";
        }

        await order.save();
        res.json({ success: true, message: `Return ${decision}`, newStatus: order.status });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error processing request." });
    }
};



// -----------------------------------------------------------------------------------------------------------------------

const viewStock = async (req, res) => {
    try {
        let { page, search } = req.query;
        page = parseInt(page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        let filter = {};
        if (search) {
            filter = { productName: { $regex: search, $options: "i" } };
        }

        const products = await Product.find(filter)
            .populate("category")
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render("admin/stockManagment", {
            products,
            totalPages,
            currentPage: page,
            searchQuery: search
        });
    } catch (error) {
        console.error("Error loading stock management:", error);
        res.status(500).send("Error loading inventory.");
    }
};

// -----------------------------------------------------------------------------------------------------------------------

const updateStock = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (quantity < 0) {
            req.flash("error", "Quantity cannot be negative.");
            return res.redirect("/admin/stock-management");
        }

        const product = await Product.findById(productId);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect("/admin/stock-management");
        }

        product.quantity = quantity;
        product.status = quantity == 0 ? "Out of Stock" : "Available";
        await product.save();

        req.flash("success", "Stock updated successfully.");
        res.redirect("/admin/stock-management");
    } catch (error) {
        console.error("Error updating stock:", error);
        req.flash("error", "Error updating stock.");
        res.redirect("/admin/stock-management");
    }
};

// -----------------------------------------------------------------------------------------------------------------------




module.exports = {
    getOrders,
    updateOrderStatus,
    verifyReturnRequest,
    searchOrders,
    viewDetails,
    approveReturnRequest,
    updateStock,
    viewStock
}