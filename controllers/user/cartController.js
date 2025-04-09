const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");


// -----------------------------------------------------------------------------------------------------------------------

const renderCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const items = await Cart.find();
    res.render("user/addToCart", { cartItems: items, userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// -----------------------------------------------------------------------------------------------------------------------

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (product.quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Product is out of stock" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (existingItem) {
      if (existingItem.quantity + quantity > product.quantity) {
        return res
          .status(400)
          .json({ success: false, message: "Not enough stock available" });
      }
      existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.quantity * product.salePrice;
    } else {
      cart.items.push({
        productId: product._id,
        quantity,
        price: product.salePrice,
        totalPrice: quantity * product.salePrice,
        image: product.productImage[0],
        category: product.category,
      });
    }

    await cart.save();
    res.json({ success: true, message: "Added to cart" });

  } catch (error) {
    console.error("Error adding to cart:", error);
    res
      .status(500)
      .json({ success: false, message: "Error adding product to cart" });
  }
};
// -----------------------------------------------------------------------------------------------------------------------

const getCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "productName category price regularPrice image stock",
      populate: { path: "category", select: "name" },
    });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    res.status(200).json({ cart });

  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// -----------------------------------------------------------------------------------------------------------------------

const getProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId).select("quantity");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------------------------------------------------

const removeFromCart = async (req, res) => {
  const { userId, productId } = req.body;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId,
    );
    await cart.save();
    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// -----------------------------------------------------------------------------------------------------------------------

const updateCartItem = async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available in stock.`,
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice =
      cart.items[itemIndex].quantity * cart.items[itemIndex].price;

    await cart.save();
    res.status(200).json({ success: true, message: "Quantity updated", cart });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------------------------------------------------

const getCartSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    let totalAmount = 0;
    let totalItems = 0;

    const cartItems = cart.items.map((item) => {
      totalItems += item.quantity;
      totalAmount += item.totalPrice;

      return {
        productId: item.productId._id,
        productName:
          item.productId.productName ||
          item.productId.name ||
          "Unknown Product",

        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
        image: item.image ? `/${item.image}` : "/images/default.png",
      };
    });

    res.status(200).json({ totalAmount, totalItems, cartItems });

  } catch (error) {
    console.error("Error fetching cart summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------------------------------------------------

module.exports = {
  addToCart,
  removeFromCart,
  getCart,
  renderCart,
  updateCartItem,
  getProduct,
  getCartSummary,
};
