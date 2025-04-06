const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema")
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const mongoose = require("mongoose");
const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// -----------------------------------------------------------------------------------------------------------------------

const renderCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.userId;
        if (!userId) return res.redirect("/login");

        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        const addressData = await Address.findOne({ userId }).lean();


        const coupons = await Coupon.find({ isList: true }).lean();

        let totalAmount = 0;
        if (cart && cart.items.length > 0) {
            totalAmount = cart.items.reduce((total, item) => {
                return total + (item.product.price * item.quantity);
            }, 0);
        }


        res.render("user/checkout", {
            cart: cart || { items: [] },
            addresses: addressData ? addressData.address : [],
            userId,
            totalAmount,
            coupons,
        });
    } catch (error) {
        console.error("Error loading checkout page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// -----------------------------------------------------------------------------------------------------------------------

const newAddress = async (req, res) => {
    try {
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        const userId = req.session.user;

        const address = await Address.findOne({ userId });

        if (address) {
            address.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
            await address.save();
        } else {
            const newAddress = new Address({
                userId,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
            });
            await newAddress.save();
        }

        res.redirect("/checkout");
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).send("Internal Server Error");
    }
};
// -----------------------------------------------------------------------------------------------------------------------

const EditAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        const userId = req.session.user;

        const address = await Address.findOneAndUpdate(
            { userId, "address._id": addressId },
            {
                $set: {
                    "address.$.addressType": addressType,
                    "address.$.name": name,
                    "address.$.city": city,
                    "address.$.landMark": landMark,
                    "address.$.state": state,
                    "address.$.pincode": pincode,
                    "address.$.phone": phone,
                    "address.$.altPhone": altPhone,
                },
            },
            { new: true, runValidators: true }
        );

        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        res.status(200).json({ success: true, message: "Address updated successfully." });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
// -----------------------------------------------------------------------------------------------------------------------


const DeleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.session.user;

        const address = await Address.findOneAndUpdate(
            { userId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        res.status(200).json({ success: true, message: "Address deleted successfully." });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// -----------------------------------------------------------------------------------------------------------------------

const proceedPayment = async (req, res) => {
    try {
        console.log("Received Payment Data:", req.body);

        const { totalAmount, addressId, items, discount = 0, coupon = "" } = req.body;

        if (!req.session.user) {
            return res.status(401).json({ message: "User not logged in" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            console.error("No items found in request!");
            return res.status(400).json({ message: "Cart is empty" });
        }

        const addressData = await Address.findOne({ userId: req.session.user });

        if (!addressData || !addressData.address) {
            return res.status(400).json({ message: "Address not found" });
        }

        const selectedAddress = addressData.address.find(addr => addr._id.toString() === addressId);

        if (!selectedAddress) {
            return res.status(400).json({ message: "Invalid address selection" });
        }


        let deliveryCharge = 50;
        const finalAmount = Number(totalAmount) - Number(discount) + Number(deliveryCharge);
        console.log("Total:", totalAmount, "Discount:", discount, "Delivery:", deliveryCharge, "Final:", finalAmount);

        req.session.paymentData = {
            totalAmount: Number(totalAmount),
            finalAmount: finalAmount,
            discount: Number(discount),
            coupon,
            deliveryCharge,
            selectedAddress,
            items
        };

        console.log("Stored Payment Data:", req.session.paymentData);

        res.json({ success: true });
    } catch (error) {
        console.error("Error proceeding to payment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// -------------------------------------------------
// Payment Page
const payment = async (req, res) => {
    if (!req.session.paymentData) {
        console.log("Payment data missing! Redirecting to checkout.");
        return res.redirect("/checkout");
    }

    console.log("Loading Payment Page with Data:", req.session.paymentData);

    res.render("user/payment", {
        totalAmount: req.session.paymentData.totalAmount,
        finalAmount: req.session.paymentData.finalAmount,
        discount: req.session.paymentData.discount,
        coupon: req.session.paymentData.coupon,
        deliveryCharge: req.session.paymentData.deliveryCharge,
        selectedAddress: req.session.paymentData.selectedAddress || {},
        items: req.session.paymentData.items || []
    });
};

// -----------------------------------------------------------------------------------------------------------------------


const getPaymentData = async (req, res) => {
    console.log("Session Payment Data:", req.session.paymentData.items);

    if (!req.session.paymentData) {
        return res.status(400).json({ message: "No payment data found" });
    }

    res.json({
        success: true,
        paymentData: req.session.paymentData
    });
};
// --------------------------------------------------------------

const generateOrderID = () => {
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// -----------------------------------------------------------------------------------------------------------------------
const orderPlaced = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: "User not logged in" });
        }

        const userId = req.session.user;
        const { paymentMethod, selectedAddressId } = req.body;
        const { totalAmount, finalAmount, items, deliveryCharge } = req.session.paymentData;

        if (!paymentMethod) {
            return res.status(400).json({ message: "Payment method is required." });
        }

        if (paymentMethod === "cod" && finalAmount > 1000) {
            return res.status(400).json({ message: "COD is not available for orders above Rs 1000." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const addressDoc = await Address.findOne({ userId: userId });
        if (!addressDoc) {
            return res.status(400).json({ message: "No addresses found for user." });
        }

        const address = addressDoc.address.find(addr => addr._id.toString() === selectedAddressId);
        if (!address) {
            return res.status(400).json({ message: "Selected address not found." });
        }

        let razorpayOrderId = null;
        let orderStatus = "Pending";

        // 🔹 Wallet Payment Handling
        if (paymentMethod === "wallet") {
            if (user.wallet < finalAmount) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
        }

        // 🔹 Razorpay Payment Handling
        if (paymentMethod === "Razorpay") {
            const orderOptions = {
                amount: finalAmount * 100,
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
                payment_capture: 1,
            };
            const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
            razorpayOrderId = razorpayOrder.id;
            orderStatus = "Awaiting Payment"; // Razorpay orders will be "Awaiting Payment"
        }

        // 🔹 Ensure Ordered Items Are Stored
        const orderedItems = items.map(item => ({
            product: item.productId,
            quantity: Number(item.quantity),
            price: Number(item.price.replace(/\D/g, '')),
        }));

        if (orderedItems.length === 0) {
            return res.status(400).json({ message: "No items found in the order." });
        }

        // 🔹 Check Stock Availability Before Placing Order
        for (const item of orderedItems) {
            const product = await Product.findById(item.product);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product?.name || "a product"}` });
            }
        }

        const discountAmount = totalAmount - finalAmount;

        const newOrder = new Order({
            orderId: generateOrderID(),
            user: userId,
            orderedItems,
            totalPrice: totalAmount,
            finalAmount,
            discountAmount,
            deliveryCharge,
            address: address._id,
            paymentMethod,
            status: orderStatus,
            razorpayOrderId: razorpayOrderId, // Razorpay ID assigned here
        });

        await newOrder.save();

        // 🔹 Deduct from Wallet if Used
        if (paymentMethod === "wallet") {
            user.wallet -= finalAmount;
            user.transactions.push({
                description: `Order Payment - ${newOrder.orderId}`,
                amount: finalAmount,
                type: "debit",
                orderId: newOrder._id,
                date: new Date(),
            });
            await user.save();
        }

        // 🔹 Decrease Stock for Ordered Products
        for (const item of orderedItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }

        // 🔹 Response for Razorpay Orders
        if (paymentMethod === "Razorpay") {
            return res.json({
                success: true,
                razorpayOrderId: razorpayOrderId,
                orderId: newOrder.orderId,
            });
        }

        // 🔹 Response for COD & Wallet Orders
        res.json({
            success: true,
            message: "Order placed successfully with COD or Wallet",
            orderId: newOrder.orderId,
            userName: user.name,
        });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Error processing order" });
    }
};


// const orderPlaced = async (req, res) => {
//     try {
//         if (!req.session.user) {
//             return res.status(401).json({ message: "User not logged in" });
//         }

//         const userId = req.session.user;
//         const { paymentMethod, selectedAddressId } = req.body;
//         const { totalAmount, finalAmount, items, deliveryCharge } = req.session.paymentData;

//         if (!paymentMethod) {
//             return res.status(400).json({ message: "Payment method is required." });
//         }

//         if (paymentMethod === "cod" && finalAmount > 1000) {
//             return res.status(400).json({ message: "COD is not available for orders above Rs 1000." });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         const addressDoc = await Address.findOne({ userId: userId });
//         if (!addressDoc) {
//             return res.status(400).json({ message: "No addresses found for user." });
//         }

//         const address = addressDoc.address.find(addr => addr._id.toString() === selectedAddressId);
//         if (!address) {
//             return res.status(400).json({ message: "Selected address not found." });
//         }

//         let razorpayOrderId = null;
//         let orderStatus = "Pending";


//         if (paymentMethod === "Razorpay") {
//             const orderOptions = {
//                 amount: finalAmount * 100,
//                 currency: "INR",
//                 receipt: `receipt_${Date.now()}`,
//                 payment_capture: 1,
//             };
//             const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
//             razorpayOrderId = razorpayOrder.id;
//             orderStatus = "Awaiting Payment";
//         }



//         const orderedItems = items.map(item => ({
//             product: item.productId,
//             quantity: Number(item.quantity),
//             price: Number(item.price.replace(/\D/g, '')),
//         }));

//         const discountAmount = totalAmount - (finalAmount - deliveryCharge);


//         const newOrder = new Order({
//             orderId: generateOrderID(),
//             user: userId,
//             orderedItems,
//             totalPrice: totalAmount,
//             finalAmount: finalAmount,
//             discountAmount,
//             deliveryCharge,
//             address: address._id,
//             paymentMethod,
//             status: orderStatus,
//             razorpayOrderId: razorpayOrderId,
//         });

//         await newOrder.save();


//         for (const item of orderedItems) {
//             await Product.updateOne(
//                 { _id: item.product },
//                 { $inc: { quantity: -item.quantity } }
//             );
//         }


//         await Cart.deleteMany({ userId: userId });


//         if (paymentMethod === "wallet") {
//             if (user.wallet < finalAmount) {
//                 return res.status(400).json({ message: "Insufficient wallet balance" });
//             }
//             console.log("New Order dID:", newOrder._id);


//             user.wallet -= finalAmount;
//             user.transactions.push({
//                 description: `Order Payment - ${newOrder.orderId}`,
//                 amount: finalAmount,
//                 type: "debit",
//                 orderId: newOrder._id,
//                 date: new Date(),
//             });
//             await user.save();
//             const updatedUser = await User.findById(user._id);
//             console.log(updatedUser.transactions[updatedUser.transactions.length - 1]);

//         }


//         if (paymentMethod === "Razorpay") {
//             res.json({
//                 success: true,
//                 razorpayOrderId: razorpayOrderId,
//                 orderId: newOrder.orderId,
//             });
//         } else {
//             res.json({
//                 success: true,
//                 message: "Order placed successfully with COD or Wallet",
//                 orderId: newOrder.orderId,
//                 userName: user.name,
//             });
//         }
//     } catch (error) {
//         console.error("Error placing order:", error);
//         res.status(500).json({ message: "Error processing order" });
//     }
// };


// ------------------------------------------------------------------------------------------------
const orderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId })
            .populate({
                path: "orderedItems.product",
                select: "productName description category regularPrice salePrice productImage"
            })
            .populate({
                path: "address",
                select: "name addressLine city state pincode phone"
            })

        if (!order) {
            return res.status(404).send("Order not found");
        }

        console.log("Populated Order:", JSON.stringify(order, null, 2));
        console.log("Ordered Items:", order.orderedItems);

        res.render("user/orderDetails", { order, paymentMethod: order.paymentMethod });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

// -----------------------------------------------------------------------------------------------------------------------

const orderCancel = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.session.user;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({ message: "Cancellation reason is required" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.status !== "Pending" && order.status !== "Processing") {
            return res.status(400).json({ message: "Order cannot be canceled at this stage" });
        }

        for (const item of order.orderedItems) {
            let product = await Product.findById(item.product);
            if (product) {
                product.quantity += item.quantity;
                product.status = "Available";
                await product.save();
            }
        }

        if (order.paymentMethod === "wallet") {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            user.wallet += order.finalAmount;
            user.transactions.push({
                description: "Order Refund",
                amount: order.finalAmount,
                type: "credit",
                date: new Date()
            });

            await user.save();
        } else if (order.paymentMethod === "Razorpay" && order.razorpayPaymentId) {
            try {
                const refund = await razorpayInstance.payments.refund(order.razorpayPaymentId, {
                    amount: order.finalAmount * 100
                });

                if (refund.status === "processed") {
                    const user = await User.findById(userId);
                    if (user) {
                        user.wallet += order.finalAmount;
                        user.transactions.push({
                            description: "Order Refund (Razorpay)",
                            amount: order.finalAmount,
                            type: "credit",
                            date: new Date()
                        });
                        await user.save();
                    }
                }
            } catch (error) {
                console.error("Error processing Razorpay refund:", error);
            }
        }

        order.status = "Cancelled";
        order.cancelReason = reason;
        order.cancelledAt = new Date();
        await order.save();

        res.json({ message: "Order canceled successfully" });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ message: "Error processing cancellation" });
    }
};



// ----------------------------------------------------------------------------------------------------------------------------------


const orderReturn = async (req, res) => {
    const { orderId, reason } = req.body;

    if (!reason) {
        return res.json({ success: false, message: "Return reason is required." });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }

        if (order.status !== "delivered") {
            return res.json({ success: false, message: "Only delivered orders can be returned." });
        }
        order.status = "Return Requested";
        order.returnReason = reason;
        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error processing return request." });
    }
};

// ----------------------------------------------------------------------------------------------------------------------------------
// const getUserOrders = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         if (!userId) {
//             return res.redirect("/login");
//         }

//         const page = parseInt(req.query.page) || 1; // Get page number from query, default to 1
//         const limit = 3; // Orders per page
//         const skip = (page - 1) * limit; // Calculate offset

//         // Get total order count for pagination
//         const totalOrders = await Order.countDocuments({ user: userId });

//         const orders = await Order.find({ user: userId })
//             .populate({
//                 path: "orderedItems.product",
//                 select: "productName productImage price",
//             })
//             .populate("address", "name addressLine city state pincode phone")
//             .sort({ createdOn: -1 })
//             .skip(skip)
//             .limit(limit);

//         const totalPages = Math.ceil(totalOrders / limit);

//         res.render("user/orderFromProfile", {
//             orders,
//             currentPage: page,
//             totalPages
//         });

//     } catch (error) {
//         console.error("Error fetching user orders:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };
const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        const page = parseInt(req.query.page) || 1; // Get page number from query, default to 1
        const limit = 3; // Orders per page
        const skip = (page - 1) * limit; // Calculate offset

        // Get total order count for pagination
        const totalOrders = await Order.countDocuments({ user: userId });

        // Fetch orders
        const orders = await Order.find({ user: userId })
            .populate({
                path: "orderedItems.product",
                select: "productName productImage price",
            })
            .populate("address", "name addressLine city state pincode phone")
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log("Fetched Orders:", orders);  // 🔴 Debugging line to check orders

        if (!orders || orders.length === 0) {
            console.log("No orders found for this user."); // 🔴 Check if no orders exist
        }

        const totalPages = Math.ceil(totalOrders / limit);

        res.render("user/orderFromProfile", {
            orders,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).send("Internal Server Error");
    }
};


// ----------------------------------------------------------------------------------------------------------------------------------

const orderTracking = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ orderId })
            .populate({
                path: "orderedItems.product",
                select: "productName productImage regularPrice salePrice"
            })
            .lean();
        if (!order) {
            return res.status(404).send("Order not found");
        }

        console.log("Fetched Order Data:", order);


        const addressDoc = await Address.findOne({
            "address._id": order.address
        }, { "address.$": 1 });

        let selectedAddress = order.address;

        if (addressDoc && addressDoc.address.length > 0) {
            selectedAddress = addressDoc.address[0];
        }

        console.log("Resolved Address:", selectedAddress);


        order.orderedItems.forEach(item => {
            if (!Array.isArray(item.product.productImage)) {
                item.product.productImage = [];
            }
        });


        let estimatedDelivery = null;
        if (order.createdOn) {
            estimatedDelivery = new Date(order.createdOn);
            estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
        }

        res.render("user/orderTracking", {
            order,
            selectedAddress,
            estimatedDelivery,
            paymentMethod: order.paymentMethod
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
};

// ----------------------------------------------------------------------------------------------------------------------------------

const generateInvoice = async (req, res) => {
    const orderId = req.params.orderId;

    try {

        const order = await Order.findById(orderId)
            .populate('orderedItems.product')
            .populate('user')
            .select('orderedItems user paymentMethod');

        if (!order) {
            return res.status(404).send('Order not found');
        }


        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
        doc.pipe(res);
        addInvoiceHeader(doc, order);
        addCustomerDetails(doc, order.user);
        addOrderedItemsTable(doc, order.orderedItems);
        addTotalAmount(doc, order.orderedItems);
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

// ----------------------------------------------------------------------------------------------------------------------------------

const addInvoiceHeader = (doc, order) => {
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown();
};
// ----------------------------------------------------------------------------------------------------------------------------------

const addCustomerDetails = (doc, user) => {
    doc.fontSize(12).text(`Customer: ${user.name || 'Unknown'}`);
    doc.moveDown();
};
// ----------------------------------------------------------------------------------------------------------------------------------

const addOrderedItemsTable = (doc, orderedItems) => {
    doc.fontSize(14).text('Ordered Items', { underline: true });
    doc.moveDown();

    const startX = 50;
    const colWidths = [220, 100, 100, 100];

    doc.fontSize(10)
        .text('Product Name', startX, doc.y, { width: colWidths[0], continued: true })
        .text('Quantity', startX + colWidths[0], doc.y, { width: colWidths[1], align: 'right', continued: true })
        .text('Price', startX + colWidths[0] + colWidths[1], doc.y, { width: colWidths[2], align: 'right', continued: true })
        .text('Total', startX + colWidths[0] + colWidths[1] + colWidths[2], doc.y, { width: colWidths[3], align: 'right' });

    doc.moveDown();
    doc.moveDown();
    orderedItems.forEach(item => {
        doc.text(item.product.productName, startX, doc.y, { width: colWidths[0], continued: true })
            .text(item.quantity.toString(), startX + colWidths[0], doc.y, { width: colWidths[1], align: 'right', continued: true })
            .text(`₹${item.product.salePrice}`, startX + colWidths[0] + colWidths[1], doc.y, { width: colWidths[2], align: 'right', continued: true })
            .text(`₹${item.quantity * item.product.salePrice}`, startX + colWidths[0] + colWidths[1] + colWidths[2], doc.y, { width: colWidths[3], align: 'right' });

        doc.moveDown();
    });

    doc.moveDown();

}
// ----------------------------------------------------------------------------------------------------------------------------------

const addTotalAmount = (doc, orderedItems) => {
    const totalAmount = orderedItems.reduce((total, item) => total + (item.quantity * item.product.salePrice), 0);
    doc.moveDown();
    doc.fontSize(12).text(`Total Amount: ₹${totalAmount}`, { align: 'right' });
};
// ----------------------------------------------------------------------------------------------------------------------------------

const searchOrders = async (req, res) => {
    const orderId = req.query.orderId;
    try {
        const orders = await Order.find({ orderId: { $regex: orderId, $options: 'i' } });
        res.render('orderSearchResults', { orders });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error searching orders');
    }
};
// ----------------------------------------------------------------------------------------------------------------------------------


module.exports = {
    renderCheckoutPage,
    newAddress,
    EditAddress,
    DeleteAddress,
    proceedPayment,
    payment,
    getPaymentData,
    orderPlaced,
    orderDetails,
    orderCancel,
    orderReturn,
    getUserOrders,
    orderTracking,
    generateInvoice,
    searchOrders


}