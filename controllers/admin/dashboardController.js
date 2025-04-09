const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const moment = require("moment");

// ------------------------------------------------------------------------------------------------------------------------
const loadDashboard = async (req, res) => {
  try {
    let { filter } = req.query;
    let startDate = moment("2000-01-01");
    let endDate = moment().endOf("day");

    if (filter === "yearly") {
      startDate = moment().startOf("year");
      endDate = moment().endOf("year");
    } else if (filter === "monthly") {
      startDate = moment().startOf("month");
      endDate = moment().endOf("month");
    } else if (filter === "weekly") {
      startDate = moment().startOf("week");
      endDate = moment().endOf("week");
    } else {
      startDate = moment("2000-01-01");
      endDate = moment().endOf("day");
    }

    const bestSellingProducts = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        },
      },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$productDetails._id",
          productName: { $first: "$productDetails.productName" },
          totalSold: { $sum: "$orderedItems.quantity" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);



    const bestSellingCategories = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        },
      },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.name",
          totalSold: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);



    res.render("admin/dashboard", {
      bestSellingProducts: bestSellingProducts || [],
      bestSellingCategories: bestSellingCategories || [],
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// ------------------------------------------------------------------------------------------------------------------------

const loadDashboardData = async (req, res) => {
  try {
    let { filter } = req.query;
    let startDate, endDate;

    if (filter === "yearly") {
      startDate = moment().startOf("year");
      endDate = moment().endOf("year");
    } else if (filter === "monthly") {
      startDate = moment().startOf("month");
      endDate = moment().endOf("month");
    } else if (filter === "weekly") {
      startDate = moment().startOf("week");
      endDate = moment().endOf("week");
    } else {
      startDate = moment("2000-01-01");
      endDate = moment().endOf("day");
    }

    const bestSellingProducts = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        },
      },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$productDetails._id",
          productName: { $first: "$productDetails.productName" },
          totalSold: { $sum: "$orderedItems.quantity" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    const bestSellingCategories = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        },
      },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.name",
          totalSold: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      bestSellingProducts: bestSellingProducts || [],
      bestSellingCategories: bestSellingCategories || [],
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ------------------------------------------------------------------------------------------------------------------------

module.exports = {
  loadDashboard,
  loadDashboardData,
};
