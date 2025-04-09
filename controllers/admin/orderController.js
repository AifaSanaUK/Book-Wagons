const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { generatePDF, generateExcel } = require("../../services/reportServices");

// --------------------------------------------------------------------------------------------------------------------

const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      sort = "createdOn",
      order = "desc",
      search = "",
      status = "",
    } = req.query;

    let query = {};
    if (search) {
      query.orderId = { $regex: search, $options: "i" };
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
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await Order.countDocuments(query);

    res.render("admin/order", {
      orders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      search,
      status,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
};
// -------------------------------------------------------------------------------------------------------

const getCancelReason = async (req, res) => {
  try {
    const { orderId } = req.params;


    const order = await Order.findById(orderId).lean();


    if (order && order.cancellationReason) {
      res.json({ success: true, reason: order.cancellationReason });
    } else {
      res.json({ success: false, message: "No cancellation reason found." });
    }
  } catch (error) {
    console.error("Error fetching cancellation reason:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------------------------------------------------
const searchOrders = async (req, res) => {
  try {
    const { query } = req.query;
    const orders = await Order.find({
      orderID: { $regex: query, $options: "i" },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error searching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
// -----------------------------------------------------------------------------------------------------------------------

const viewDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate({
        path: "orderedItems.product",
        select: "productName regularPrice salePrice productImage",
      })
      .populate("user", "name email")
      .exec();
    const addressDoc = await Address.findOne(
      {
        "address._id": order.address,
      },
      { "address.$": 1 },
    );

    let selectedAddress = order.address;

    if (addressDoc && addressDoc.address.length > 0) {
      selectedAddress = addressDoc.address[0];
    }

    const { discountAmount, deliveryCharge, couponCode } = order;


    if (!order) {
      return res.status(404).send("Order not found");
    }



    res.render("admin/ordersDetails", {
      order,
      selectedAddress,
      discountAmount,
      deliveryCharge,
      couponCode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// -----------------------------------------------------------------------------------------------------------------------

const updateOrderStatus = async (req, res) => {
  try {


    const { orderId, status } = req.body;
    if (!orderId || !status) {
      req.flash("error", "Invalid request");
      return res.redirect("/admin/orders");
    }

    await Order.findByIdAndUpdate(orderId, { status });

    req.flash("success", "Order status updated");
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error("Error updating order:", error);
    req.flash("error", "Failed to update order status");
    res.redirect(`/admin/orders/${orderId}`);
  }
};

// -----------------------------------------------------------------------------------------------------------------------

const verifyReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("user");

    if (!order || order.status !== "Return Requested") {
      req.flash("error", "Invalid return request");
      return res.redirect("/admin/orders");
    }

    const user = await User.findById(order.user._id);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/admin/orders");
    }

    user.wallet += order.finalAmount;
    user.transactions.push({
      amount: order.finalAmount,
      type: "credit",
      description: `Refund for Order ${order.orderId}`,
      date: new Date(),
    });

    await user.save();

    order.status = "Returned";
    await order.save();

    req.flash("success", "Return verified and refunded to wallet");
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to process return");
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
      return res.json({
        success: false,
        message: "No pending return request.",
      });
    }

    const user = await User.findById(order.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (decision === "Approved") {
      order.status = "Return Approved";

      user.wallet += order.finalAmount;
      user.transactions.push({
        amount: order.finalAmount,
        type: "credit",
        description: `Refund for Order ${order.orderId}`,
        date: new Date(),
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
    res.json({
      success: true,
      message: `Return ${decision}`,
      newStatus: order.status,
    });
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
      searchQuery: search,
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

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        quantity: quantity,
        status: quantity == 0 ? "Out of Stock" : "Available",
      },
      { new: true },
    );

    if (!updatedProduct) {
      req.flash("error", "Product not found.");
      return res.redirect("/admin/stock-management");
    }

    req.flash("success", "Stock updated successfully.");
    res.redirect("/admin/stock-management");
  } catch (error) {
    console.error(" Error updating stock:", error);
    req.flash("error", "Error updating stock.");
    res.redirect("/admin/stock-management");
  }
};

// ----------------------------------------------------------------------------------------------------

const getSalesReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const filter = {};

    const now = new Date();

    if (req.query.filter) {
      const filterType = req.query.filter.toLowerCase();

      if (filterType === "daily") {
        filter.createdOn = {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        };
      } else if (filterType === "weekly") {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        filter.createdOn = {
          $gte: startOfWeek,
          $lte: now,
        };
      } else if (filterType === "yearly") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        filter.createdOn = {
          $gte: startOfYear,
          $lte: now,
        };
      }
    }

    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).send("Invalid date format");
      }

      endDate.setHours(23, 59, 59, 999);

      if (startDate > endDate) {
        return res.status(400).send("Start date must be before end date");
      }

      filter.createdOn = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const orders = await Order.find(filter)
      .populate("user")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrdersCount = await Order.countDocuments(filter);
    const totalSales = (await Order.find(filter)).reduce(
      (sum, order) => sum + order.finalAmount,
      0,
    );

    const returnApprovedOrders = await Order.countDocuments({
      ...filter,
      status: "Return Approved",
    });

    const totalDiscount = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$discountAmount" } } },
    ]);

    const cancelledOrders = await Order.countDocuments({
      ...filter,
      status: "Cancelled",
    });

    res.render("admin/salesReport", {
      orders,
      totalOrders: totalOrdersCount,
      totalSales,
      returnApprovedOrders,
      totalDiscount: totalDiscount[0]?.total || 0,
      cancelledOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrdersCount / limit),
      filter: req.query.filter || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).send("Server Error");
  }
};

// ----------------------------------------------------------------------------------------------------

const downloadPDF = async (req, res) => {
  try {
    const filter = {};
    if (req.query.filter) {
      filter.status = req.query.filter;
    }
    if (req.query.startDate && req.query.endDate) {
      filter.createdOn = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const orders = await Order.find(filter).sort({ createdOn: -1 });

    const filePath = await generatePDF(orders, filter);

    const absolutePath = path.resolve(filePath);


    if (fs.existsSync(absolutePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales_report.pdf`,
      );

      const readStream = fs.createReadStream(absolutePath);

      readStream.on("open", () => {
        readStream.pipe(res);
      });

      readStream.on("error", (err) => {
        console.error("Error reading file:", err);
        res.status(500).send("Error downloading the PDF");
      });
    } else {
      console.error("File does not exist");
      res.status(404).send("PDF file not found");
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Server Error");
  }
};
// ----------------------------------------------------------------------------------------------------

const downloadExcel = async (req, res) => {
  try {
    const filter = {};
    if (req.query.filter) {
      filter.status = req.query.filter;
    }
    if (req.query.startDate && req.query.endDate) {
      filter.createdOn = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const orders = await Order.find(filter).sort({ createdOn: -1 });
    const filePath = await generateExcel(orders, filter);

    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading Excel:", err);
        res.status(500).send("Could not download the Excel file");
      }
    });
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("Server Error");
  }
};

// -----------------------------------------------------------------------------------------------------------------------

module.exports = {
  getOrders,
  getCancelReason,
  updateOrderStatus,
  verifyReturnRequest,
  searchOrders,
  viewDetails,
  approveReturnRequest,
  updateStock,
  viewStock,
  getSalesReport,
  downloadExcel,
  downloadPDF,
};
