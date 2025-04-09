const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");

// ----------------------------------------------------------------------------------------------------------------------------------------------------
const getProductsPage = async (req, res) => {
  try {


    let page = Math.max(1, parseInt(req.query.page) || 1);
    let limit = 5;
    let skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.max(1, Math.ceil(totalProducts / limit));

    if (page > totalPages && totalPages !== 0) {
      return res.redirect(`?page=${totalPages}`);
    }

    const products = await Product.find()
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();



    const categories = await Category.find({ status: "Listed" }).lean();

    res.render("admin/productAddPages", {
      cat: categories,
      products,
      currentPage: page,
      totalPages: totalPages,
      totalProducts: totalProducts,
    });
  } catch (error) {
    console.error("Error in getProductsPage:", error);
    res.redirect("/pageerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------
const addProducts = async (req, res) => {
  try {
    const {
      product_name,
      description,
      category,
      regular_price,
      sale_price,
      quantity,
      offer,
    } = req.body;


    if (
      !product_name ||
      !description ||
      !category ||
      !regular_price ||
      !quantity
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    const productExists = await Product.findOne({ productName: product_name });
    if (productExists) {
      return res.status(400).json({
        message: "Product already exists, please try with another name.",
      });
    }

    const categoryData = await Category.findOne({ name: category });

    if (!categoryData) {
      return res.status(400).json({ message: "Invalid category name." });
    }

    const images = [];

    if (req.files) {
      for (const fileArray of Object.values(req.files)) {
        for (const file of fileArray) {
          const imagePath = file.path
            .replace(/\\/g, "/")
            .replace(/^public\//, "");
          images.push(imagePath);
        }
      }
    }

    const newProduct = new Product({
      productName: product_name,
      description,
      category: categoryData._id,
      regularPrice: regular_price,
      salePrice: sale_price !== undefined ? sale_price : 0,
      productOffer: offer,
      createdOn: new Date(),
      quantity,
      productImage: images,
      status: "Available",
    });

    await newProduct.save();
    return res.status(201).json({ message: "Product added successfully!" });
  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};
// ----------------------------------------------------------------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------------------------------------------------------------------

const getAllproducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = 5;

    const productData = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    })
      .limit(limit)
      .skip((page - 1) * limit)

      .populate("category")
      .lean()
      .exec();

    const count = await Product.countDocuments({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    });



    const totalProducts = count;
    const totalPages = Math.ceil(totalProducts / limit);
    const category = await Category.find({ status: "Listed" });


    if (category.length > 0) {
      res.render("admin/products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        search: req.query.search || "",
      });
    } else {
      res.render("admin/page404");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/admin/pageerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------
const addOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;


    const findProduct = await Product.findOne({ _id: productId });
    if (!findProduct) {
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });
    }

    const findCategory = await Category.findOne({ _id: findProduct.category });

    const regularPrice = parseFloat(findProduct.regularPrice);
    if (isNaN(regularPrice) || regularPrice <= 0) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid product price" });
    }

    const productOffer = parseFloat(percentage);
    if (isNaN(productOffer) || productOffer < 0 || productOffer > 100) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid product offer percentage" });
    }

    const categoryOffer = findCategory?.categoryOffer
      ? parseFloat(findCategory.categoryOffer)
      : 0;
    if (isNaN(categoryOffer)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid category offer" });
    }

    const productDiscount = Math.floor(regularPrice * (productOffer / 100));

    const categoryDiscount = Math.floor(regularPrice * (categoryOffer / 100));

    const highestDiscount = Math.max(productDiscount, categoryDiscount);

    const salePrice = regularPrice - highestDiscount;
    if (isNaN(salePrice) || salePrice < 0) {
      return res
        .status(400)
        .json({ status: false, message: "Calculated sale price is invalid" });
    }

    findProduct.salePrice = salePrice;
    findProduct.productOffer = productOffer;
    findProduct.highestOffer =
      highestDiscount === productDiscount ? productOffer : categoryOffer;

    await findProduct.save();

    res.json({
      status: true,
      message: "Product offer applied successfully",
      salePrice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------

const removeOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findById(productId);

    if (!findProduct) {
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });
    }

    const findCategory = await Category.findById(findProduct.category);

    findProduct.productOffer = 0;

    const regularPrice = parseFloat(findProduct.regularPrice);
    if (isNaN(regularPrice) || regularPrice <= 0) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid regular price" });
    }

    const categoryOffer = findCategory?.categoryOffer
      ? parseFloat(findCategory.categoryOffer)
      : 0;
    const categoryDiscount = Math.floor(regularPrice * (categoryOffer / 100));

    const salePrice = regularPrice - categoryDiscount;
    if (isNaN(salePrice) || salePrice < 0) {
      return res
        .status(400)
        .json({ status: false, message: "Calculated sale price is invalid" });
    }

    findProduct.salePrice = salePrice;
    findProduct.highestOffer = categoryOffer;

    await findProduct.save();

    res.json({
      status: true,
      message: "Product offer removed successfully",
      salePrice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------

const blockProduct = async (req, res) => {
  try {
    let id = req.body.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error blocking product:", error);
    res.redirect("/pagerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------
const unblockProduct = async (req, res) => {
  try {
    let id = req.body.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pagerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;

    const product = await Product.findOne({ _id: id }).populate("category");

    if (!product) {
      return res.redirect("/admin/pageerror");
    }
    const categories = await Category.find({});
    res.render("admin/editProduct", {
      product: product,
      cat: categories,
    });
  } catch (error) {
    console.error("Error fetching product data:", error);
    res.redirect("/admin/pageerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------
const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const duplicateProduct = await Product.findOne({
      productName: data.product_name,
      _id: { $ne: id },
    });

    if (duplicateProduct) {
      return res.status(400).json({
        error: "Product with this name already exists. Please try again",
      });
    }

    let updatedImages = [...existingProduct.productImage];

    ["image1", "image2", "image3"].forEach((key, index) => {
      if (req.files[key] && req.files[key].length > 0) {
        const imagePath = req.files[key][0].path
          .replace(/\\/g, "/")
          .replace(/^public\//, "");
        updatedImages[index] = imagePath;
      }
    });



    await Product.findByIdAndUpdate(
      id,
      {
        productName: data.product_name,
        description: data.description,
        category: data.category,
        regularPrice: data.regular_price,
        salePrice: data.sale_price,
        quantity: data.quantity,
        productImage: updatedImages,
      },
      { new: true },
    );

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error while updating product:", error);
    res.redirect("/admin/pageerror");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------
const deleteSingleImage = async (req, res) => {
  try {
    const { imageName, productId } = req.params;


    if (!imageName || !productId) {
      return res
        .status(400)
        .json({ error: "Missing image name or product ID" });
    }

    const decodedImageName = decodeURIComponent(imageName);

    const product = await Product.findByIdAndUpdate(
      productId,
      { $pull: { productImage: decodedImageName } },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const imagePath = path.join(
      "public",
      "uploads",
      "productImages",
      decodedImageName,
    );


    try {
      await fs.unlink(imagePath);

    } catch (fsError) {
      console.log(
        `Image ${decodedImageName} not found or failed to delete: ${fsError}`,
      );
    }

    res.send({ status: true });
  } catch (error) {
    console.error("Error while deleting image:", error);
    res.redirect("/admin/pageerror");
  }
};
// ----------------------------------------------------------------------------------------------------------------------------------------------------

const deleteProduct = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Product ID is required" });
  }
  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  getProductsPage,
  addProducts,
  getAllproducts,
  addOffer,
  removeOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteProduct,
  deleteSingleImage,
};
