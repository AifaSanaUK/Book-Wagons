const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");
// ------------------------------------------------------------------------------------------------------------------------------------
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);



    res.render("admin/category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.error("Pagination Error:", error);
    res.redirect("/pageerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------

const addCategory = async (req, res) => {

  const { name, description } = req.body;

  if (!name || !description) {
    console.log("Validation Failed!");
    return res.status(400).json({ error: "All fields are required" });
  }
  try {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") },
    });

    if (existingCategory) {

      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();
    console.log("Category Saved Successfully!");

    return res.json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Error Saving Category:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Edit category -
const editCategory = async (req, res) => {
  const { id } = req.params;


  if (!mongoose.Types.ObjectId.isValid(id)) {

    return res.status(400).json({ error: "Invalid category ID" });
  }
  try {
    const category = await Category.findById(id);
    if (!category) {

      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error in fetching category:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------------------------------------------------------------------------------------------------------------------------------
// Update category
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") },
      _id: { $ne: id },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true },
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    return res.json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------

// delete
const toggleCategoryStatus = async (req, res) => {
  const { id } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {

    return res.status(400).json({ error: "Invalid category ID" });
  }
  try {
    const category = await Category.findById(id);
    if (!category) {

      return res.status(404).json({ error: "Category not found" });
    }

    category.status = category.status === "Listed" ? "Unlisted" : "Listed";

    await category.save();

    res.json({ message: "Category status updated successfully", category });
  } catch (error) {
    console.error("Error in toggling category status:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------

// offer set
const setOffer = async (req, res) => {
  const { id } = req.params;
  const { offerPrice } = req.body;


  if (!mongoose.Types.ObjectId.isValid(id)) {

    return res.status(400).json({ error: "Invalid category ID" });
  }
  if (!offerPrice) {

    return res.status(400).json({ error: "Offer price is required" });
  }

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { offerPrice: offerPrice, offer: "Yes" },
      { new: true },
    );

    if (!updatedCategory) {

      return res.status(404).json({ error: "Category not found" });
    }

    console.log(`Offer set successfully: ${updatedCategory}`);
    res.json({ message: "Offer set successfully", category: updatedCategory });
  } catch (error) {

    res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------

const removeOffer = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`Invalid category ID: ${id}`);
    return res.status(400).json({ error: "Invalid category ID" });
  }
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { offerPrice: null, offer: "No" },
      { new: true },
    );

    if (!updatedCategory) {

      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      message: "Offer removed successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error in removing offer:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

const fetchCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    return res.json({ cat: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

const deleteCategory = async (req, res) => {
  const { id } = req.body;
  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------

const listCategory = async (req, res) => {
  const { id } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.status = "Listed";
    await category.save();

    res.json({ message: "Category listed successfully", category });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------

const unlistCategory = async (req, res) => {
  const { id } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.status = "Unlisted";
    await category.save();

    res.json({ message: "Category unlisted successfully", category });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  categoryInfo,
  addCategory,
  editCategory,
  toggleCategoryStatus,
  setOffer,
  removeOffer,
  deleteCategory,
  fetchCategories,
  updateCategory,
  listCategory,
  unlistCategory,
};
