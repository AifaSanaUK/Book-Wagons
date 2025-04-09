const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

// ----------------------------------------------------------------------------------------------------------------------------------

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;

    const product = await Product.findById(productId).populate("category");

    if (!product || product.isBlocked) {
      return res.render("user/productNotFound", { user: userData });
    }

    const findCategory = product.category;

    const categoryOffer = findCategory?.offerPrice || 0;
    const productOffer = product.productOffer || 0;



    const highestOffer = Math.max(categoryOffer, productOffer);


    const regularPrice = product.regularPrice;
    const highestDiscount = Math.floor((regularPrice * highestOffer) / 100);
    const salePrice = regularPrice - highestDiscount;

    const relatedProducts = await Product.find({
      category: findCategory._id,
      _id: { $ne: productId },
      isBlocked: false,
    }).limit(4);

    res.render("user/productDetails", {
      user: userData,
      userId,
      product,
      quantity: product.quantity,
      highestOffer,
      salePrice,
      category: findCategory,
      relatedProducts,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.redirect("/pageNotFound");
  }
};

// ----------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  productDetails,
};
