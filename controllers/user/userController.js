const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Banner = require("../../models/bannerSchema");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt");
const Coupon = require("../../models/couponSchema");

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify Your Account",
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error(" Error sending email:", error);
    return false;
  }
}

// ----------------------------------------------------------------------------------------------------------

// Secure
const securedPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error(" Error hashing password:", error);
    throw error;
  }
};

// ----------------------------------------------------------------------------------------------------------

const loadHomepage = async (req, res) => {
  try {
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
    });
    const userId = req.session.user;
    const categories = await Category.find({ status: true });
    let ProductData = await Product.find({
      status: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });
    ProductData.sort(
      (a, b) => new Date.UTC(b.createdOn) - new Date(a.createdOn),
    );
    ProductData = ProductData.slice(0, 4);

    if (userId) {
      const userData = await User.findOne({ _id: userId });
      res.render("user/home", {
        user: userData,
        products: ProductData,
        banner: findBanner || [],
      });
    } else {
      res.render("user/home", { products: ProductData });
    }
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.status(500).send("Server Error");
  }
};

// -------------------------------------------------------------------------------------------------------------------

const loadSignupPage = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    res.status(500).send("Server Error");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const loadLogin = async (req, res) => {
  try {


    if (req.session.user) {
      return res.redirect("/");
    }

    return res.render("user/login");
  } catch (error) {
    console.error("Error in loadLogin:", error);
    return res.redirect("/pageNotFound");
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const login = async (req, res) => {
  try {
    const { email, password } = req.body;


    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.status(400).json({ message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.status(403).json({ message: "User is blocked by Admin" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    req.session.user = findUser._id;


    req.session.save(() => {
      res.json({ success: true, message: "Login successful", redirect: "/" });
    });
  } catch (error) {
    console.error("Login Error", error);
    return res
      .status(500)
      .json({ message: "Login failed. Please try again later." });
  }
};

// ----------------------------------------------------------------------------------------------------------

const signup = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, referralCode } =
      req.body;
    const errors = [];

    if (!/^[A-Za-z\s]+$/.test(name))
      errors.push("Only letters and spaces are allowed in the name.");
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))
      errors.push("Invalid email format.");
    if (!/^\d{10}$/.test(phone)) errors.push("Phone number must be 10 digits.");
    if (password.length < 8)
      errors.push("Password must be at least 8 characters.");
    if (password !== confirmPassword) errors.push("Passwords do not match.");

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: errors.join(", ") });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists. Please log in or use a different email.",
      });
    }

    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
      if (!referredByUser) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid referral code." });
      }
    }

    const newReferralCode = generateReferralCode();

    const otp = generateOtp();
    await sendVerificationEmail(email, otp);

    req.session.otpData = {
      name,
      email,
      phone,
      password,
      otp,
      referredBy: referredByUser ? referredByUser._id : null,
      referralCode: newReferralCode,
    };
    req.session.otpExpiry = Date.now() + 60000;

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please verify your email.",
      redirectUrl: "/verifyotp",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ----------------------------------------------------------------------------------------------------------

const verifyOtp = async (req, res) => {
  const { otp } = req.body;


  try {
    if (!req.session.otpData) {
      console.log("Session expired");
      return res.status(400).json({
        success: false,
        message: "Session expired. Please try again.",
      });
    }

    if (otp.toString() === req.session.otpData.otp.toString()) {
      const user = req.session.otpData;
      const passwordHash = await securedPassword(user.password);

      const referralExpiryDate = new Date();
      referralExpiryDate.setMonth(referralExpiryDate.getMonth() + 1);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        referralCode: generateReferralCode(),
        referredBy: user.referredBy || null,
        referralReward: 50,
        referralExpiry: referralExpiryDate,
      });

      await saveUserData.save();

      if (user.referredBy) {
        await User.findByIdAndUpdate(user.referredBy, {
          $inc: { wallet: 100 },
          $push: {
            transactions: {
              date: new Date(),
              description: "Referral Reward (New Signup)",
              amount: 100,
              type: "credit",
            },
          },
        });

        await User.findByIdAndUpdate(saveUserData._id, {
          $inc: { wallet: 50 },
          referralExpiry: referralExpiryDate,
          $push: {
            transactions: {
              date: new Date(),
              description: "Signup Bonus via Referral",
              amount: 50,
              type: "credit",
            },
          },
        });


      }

      req.session.otpData = null;
      req.session.user = saveUserData._id;

      res.json({
        success: true,
        message: "OTP Verified successfully!",
        redirectUrl: "/",
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ success: false, message: "An error occurred." });
  }
};

// ----------------------------------------------------------------------------------------------------------

const pageNotFound = async (req, res) => {
  try {
    res.status(404).render("user/page404");
  } catch (error) {
    res.status(500).send("Something went wrong!");
  }
};

// ----------------------------------------------------------------------------------------------------------

const loadVerifyOtpPage = async (req, res) => {
  if (!req.session.otpData) {
    return res.render("user/signup", {
      message: { error: ["Session expired. Try signing up again."] },
    });
  }
  if (Date.now() > req.session.otpExpiry) {
    return res.render("user/signup", {
      message: { error: ["OTP expired. Please request a new one."] },
    });
  }

  return res.render("user/verifyotp", {
    otp: req.session.otpData.otp,
    message: { success: ["OTP sent successfully!"] },
  });
};

// ----------------------------------------------------------------------------------------------------------
const resendOtp = async (req, res) => {
  try {
    if (!req.session.otpData) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }
    const newOtp = generateOtp();

    req.session.otpData.otp = newOtp;
    const emailSent = await sendVerificationEmail(
      req.session.otpData.email,
      newOtp,
    );
    if (!emailSent) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to resend OTP. Try again." });
    }

    res.json({
      success: true,
      otp: newOtp,
      message: "OTP resent successfully!",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const logout = async (req, res) => {
  try {
    if (!req.session) {

      return res.status(400).json({ message: "No active session found." });
    }

    if (req.session.user && req.session.user.isBlocked) {
      console.log("Blocked user detected. Logging out...");
    }

    req.session.destroy((error) => {
      if (error) {
        console.log("Session destruction error:", error);
        return res
          .status(500)
          .json({ message: "Logout failed. Please try again." });
      }
      res.clearCookie("connect.sid");

      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const loadShoppingPage = async (req, res) => {
  try {
    const user = req.session.user || null;
    const userData = user ? await User.findById(user) : null;

    const categories = await Category.find({ status: "Listed" });
    const categoryIds = categories.map((category) => category._id.toString());

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const selectedSort = req.query.sort || "";
    const selectedPriceRange = req.query.priceRange || "";

    let query = {
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    };

    if (selectedPriceRange) {
      const [minPrice, maxPrice] = selectedPriceRange.split("-").map(Number);
      query.salePrice = { $gte: minPrice, $lte: maxPrice };
    }

    let sortQuery = {};
    if (selectedSort === "low-high") {
      sortQuery.salePrice = 1;
    } else if (selectedSort === "high-low") {
      sortQuery.salePrice = -1;
    } else {
      sortQuery.createdOn = -1;
    }

    const products = await Product.find(query)
      .populate("category")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    for (let product of products) {
      const regularPrice = product.regularPrice;
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.offerPrice || 0;

      const productDiscount = Math.floor((regularPrice * productOffer) / 100);
      const categoryDiscount = Math.floor((regularPrice * categoryOffer) / 100);

      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      product.highestOffer =
        highestDiscount === productDiscount ? productOffer : categoryOffer;

      product.salePrice = regularPrice - highestDiscount;

      await product.save();
    }

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("user/shop", {
      user: userData,
      products,
      category: categories,
      totalProducts,
      currentPage: page,
      totalPages,
      selectedSort,
      selectedPriceRange,
      userId: userData ? userData._id : null,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.redirect("/pageNotFound");
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------
const filterProduct = async (req, res) => {
  try {
    const user = req.session.user || null;
    const category = req.query.category;
    const sortOption = req.query.sort;
    const priceRange = req.query.priceRange;

    let findCategory = category
      ? await Category.findOne({ name: category })
      : null;

    let query = {
      isBlocked: false,
      quantity: { $gt: 0 },
    };

    if (findCategory) {
      query.category = findCategory._id;
    }

    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-").map(Number);
      query.salePrice = { $gte: minPrice, $lte: maxPrice };
    }

    let sortQuery = { createdOn: -1 };
    if (sortOption === "low-high") {
      sortQuery = { salePrice: 1 };
    } else if (sortOption === "high-low") {
      sortQuery = { salePrice: -1 };
    } else if (sortOption === "a-z") {
      sortQuery = { productName: 1 };
    } else if (sortOption === "z-a") {
      sortQuery = { productName: -1 };
    }

    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let skip = (currentPage - 1) * itemsPerPage;

    let findProducts = await Product.find(query)
      .populate("category", "name")
      .sort(sortQuery)
      .skip(skip)
      .limit(itemsPerPage)
      .lean();
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    const categories = await Category.find({ status: "Listed" });

    res.render("user/shop", {
      user,
      products: findProducts,
      category: categories,
      totalPages,
      currentPage,
      selectedCategory: category || null,
      selectedSort: sortOption || "",
      selectedPriceRange: priceRange || "",
    });
  } catch (error) {
    console.error("Error in filterProduct:", error);
    res.redirect("/pageNotFound");
  }
};
// ----------------------------------------------------------------------------------------------------------------------------------

const searchSortFilterProducts = async (req, res) => {
  try {
    const { search, category, sort, priceRange, page } = req.query;

    let query = {
      isBlocked: false,
      quantity: { $gt: 0 },
    };

    if (search) {
      query.productName = { $regex: new RegExp(search, "i") };
    }

    if (category) {
      const categories = category.split(",");
      const categoryIds = await Category.find({
        name: { $in: categories },
      }).distinct("_id");
      query.category = { $in: categoryIds };
    }

    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-").map(Number);
      query.salePrice = { $gte: minPrice, $lte: maxPrice };
    }

    let sortQuery = { createdOn: -1 };
    if (sort === "low-high") {
      sortQuery = { salePrice: 1 };
    } else if (sort === "high-low") {
      sortQuery = { salePrice: -1 };
    } else if (sort === "a-z") {
      sortQuery = { productName: 1 };
    } else if (sort === "z-a") {
      sortQuery = { productName: -1 };
    }

    const currentPage = parseInt(page) || 1;
    const limit = 10;
    const skip = (currentPage - 1) * limit;

    const products = await Product.find(query)
      .populate("category", "name")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      products,
      totalProducts,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error("Error in searchSortFilterProducts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// ----------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  loadHomepage,
  loadSignupPage,
  signup,
  verifyOtp,
  pageNotFound,
  resendOtp,
  loadVerifyOtpPage,
  loadLogin,
  login,
  logout,
  loadShoppingPage,
  filterProduct,
  searchSortFilterProducts,
};
