const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
// ------------------------------------------------------------------------------------------------------------------------------------------------------
function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4><br></b>`,
    };
    const info = await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------

const securePassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error("Error hashing password:", error);
    return null;
  }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------
const getForgetPassPage = async (req, res) => {
  try {
    res.render("user/forgetpassword");
  } catch (error) {
    res.redirect("/user/page404");
  }
};

const forgetEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });

    if (!findUser) {
      return res.json({
        success: false,
        message: "User with this email does not exist.",
      });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      req.session.userOtp = otp;
      req.session.email = email;
      req.session.otpExpiry = Date.now() + 5 * 60 * 1000;


      res.json({ success: true, message: "OTP sent successfully!" });
    } else {
      res.json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in forgetEmailValid:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Try again." });
  }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------

const verifyOOtp = async (req, res) => {
  try {
    const { otp } = req.body;


    if (!req.session.userOtp || !req.session.email || !req.session.otpExpiry) {

      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }
    if (Date.now() > req.session.otpExpiry) {

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }
    if (otp.toString() === req.session.userOtp.toString()) {

      req.session.otpVerified = true;
      await req.session.save();
      return res.json({
        success: true,
        message: "OTP Verified successfully!",
        redirectUrl: "/reset-password",
      });
    } else {
      console.log(" Invalid OTP!");
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    console.error(" Error during OTP verification:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------
const OtpPage = async (req, res) => {
  if (!req.session.otpData) {
    return res.render("user/forgetpassOtp", {
      message: { error: ["Session expired. Try signing up again."] },
    });
  }

  if (Date.now() > req.session.otpExpiry) {
    return res.render("user/login", {
      message: { error: ["OTP expired. Please request a new one."] },
    });
  }

  return res.render("user/forgetpassOtp", {
    otp: req.session.otpData.otp,
    message: { success: ["OTP sent successfully!"] },
  });
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------

const resendOtp = async (req, res) => {
  try {

    if (!req.session.email) {

      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }
    const newOtp = generateOtp();

    req.session.userOtp = newOtp;
    req.session.otpExpiry = Date.now() + 600000;
    await req.session.save();

    const emailSent = await sendVerificationEmail(req.session.email, newOtp);
    if (!emailSent) {

      return res
        .status(500)
        .json({ success: false, message: "Failed to resend OTP. Try again." });
    }

    res.json({ success: true, message: "OTP resent successfully!" });
  } catch (error) {
    console.error(" Resend OTP Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const validateOtp = async (req, res) => {
  try {
    const { otp } = req.body;


    if (!req.session.userOtp || !req.session.email) {

      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }
    if (otp !== req.session.userOtp) {

      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });
    }


    res.json({ success: true, message: "OTP validated successfully!" });
  } catch (error) {
    console.error("OTP Validation Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const resetpassword = async (req, res) => {
  try {
    res.render("user/resetpassword");
  } catch (error) {
    res.redirect("/user/page404");
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const postResetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.email;

    if (newPassword !== confirmPassword) {
      return res.render("user/resetpassword", {
        message: "Passwords do not match",
      });
    }
    const passwordHash = await securePassword(newPassword);

    if (!passwordHash) {

      return res.render("user/resetpassword", {
        message: "Error hashing password, try again.",
      });
    }


    const result = await User.updateOne(
      { email: email },
      { $set: { password: passwordHash } },
    );


    if (result.modifiedCount === 0) {

      return res.render("user/resetpassword", {
        message: "Something went wrong, try again.",
      });
    }
    res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.redirect("/user/pageNotFound");
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------
const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });
    res.render("user/profile", {
      user: userData,
      userAddress: addressData,
    });
  } catch (error) {
    console.error("Error for retriving profile data", error);
    res.redirect("/user/pageNotFound");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const changeEmail = async (req, res) => {
  try {
    res.render("user/changeemail");
  } catch (error) {
    res.redirect("/user/page404");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------
const changeEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;

        return res
          .status(200)
          .json({ success: true, redirectUrl: "/changeemailotp" });
      } else {
        return res.status(500).json({ message: "Error sending email." });
      }
    } else {
      return res
        .status(404)
        .json({ message: "User with this email does not exist." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const renderChangeEmailOtp = (req, res) => {
  res.render("user/changeemailotp");
};

const resendEmailOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "No email found in session." });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      req.session.userOtp = otp;
      req.session.lastOtpRequest = Date.now();
      return res
        .status(200)
        .json({ success: true, message: "OTP sent successfully." });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Error sending OTP." });
    }
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const verifyEmailOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      req.session.userData = req.body.userData;
      res.render("user/newemail", {
        userData: req.session.userData,
      });
    } else {
      res.render("user/changeemailotp", {
        message: "OTP not matching",
        userData: req.session.userData,
      });
    }
  } catch (error) {
    res.redirect("/user/page404");
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const updateEmail = async (req, res) => {
  try {
    const newEmail = req.body.newEmail;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating email:", error);
    res.status(500).json({ success: false, message: "Error updating email." });
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const changePassword = async (req, res) => {
  try {
    res.render("user/changepassword");
  } catch (error) {
    res.redirect("/user/pageNotFound");
  }
};

// ----------------------------------------------------------------------------------------------------------------------

const changePasswordValid = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "User with this email does not exist.",
      });
    }
    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.json({
        success: false,
        message: "Failed to send OTP, please try again later.",
      });
    }
    req.session.userOtp = otp;
    req.session.userEmail = email;

    console.log("OTP Sent:", otp);

    res.json({
      success: true,
      redirectUrl: "/change-password-otp",
    });
  } catch (error) {
    console.error("Error in email verification:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const verifyChangePassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "An error ovvires" });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const updateProfile = async (req, res) => {


  if (!req.session.user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: No user session" });
  }

  const { name, phone } = req.body;

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Phone number must be exactly 10 digits!",
    });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user,
      { name, phone },
      { new: true },
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// ---------------------------------------------------------------------------------------------------------------
const addressButton = async (req, res) => {
  try {
    const userId = req.session.user;


    const addressData = await Address.find({ userId: userId });



    res.render("user/addressButton", {
      userAddress: addressData[0] || { address: [] },
    });
  } catch (error) {
    console.error("Error fetching address data:", error);
    res.redirect("/pageNotFound");
  }
};
// ----------------------------------------------------------------------------------------------------

const addAddress = async (req, res) => {
  try {
    const user = req.session.user;
    res.render("user/addAddress", { user: user });
  } catch (error) {
    res.redirect("/user/pageNotFound");
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not logged in" });
    }

    const userData = await User.findOne({ _id: userId });
    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;
    let userAddress = await Address.findOne({ userId: userData._id });
    if (!userAddress) {
      userAddress = new Address({
        userId: userData._id,
        address: [
          {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
          },
        ],
      });
    } else {
      userAddress.address.push({
        addressType,
        name,
        city,
        landMark,
        state,
        pincode,
        phone,
        altPhone,
      });
    }
    await userAddress.save();

    res.json({
      success: true,
      message: "Address added successfully!",
      redirectUrl: "/addressButton",
    });
  } catch (error) {
    console.error("Error adding address", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const getAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not logged in" });
    }

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res
        .status(404)
        .json({ success: false, message: "No addresses found" });
    }

    const addressToEdit = userAddress.address.id(addressId);
    if (!addressToEdit) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, address: addressToEdit });
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const updatedData = req.body;
    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not logged in" });
    }

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res
        .status(404)
        .json({ success: false, message: "No addresses found" });
    }
    const addressToUpdate = userAddress.address.id(addressId);
    if (!addressToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }
    addressToUpdate.set(updatedData);
    await userAddress.save();

    res.json({
      success: true,
      message: "Address updated successfully",
      address: addressToUpdate,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ------------------------------------------------------------------------------------------

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not logged in" });
    }

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res
        .status(404)
        .json({ success: false, message: "No addresses found" });
    }
    const addressToDelete = userAddress.address.id(addressId);
    if (!addressToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    userAddress.address.pull(addressId);
    await userAddress.save();

    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// --------------------------------------------------------------------------------------

module.exports = {
  getForgetPassPage,
  forgetEmailValid,
  sendVerificationEmail,
  verifyOOtp,
  OtpPage,
  resendOtp,
  resetpassword,
  validateOtp,
  postResetPassword,
  securePassword,
  userProfile,
  changeEmail,
  changeEmailValid,
  renderChangeEmailOtp,
  verifyEmailOtp,
  updateEmail,
  resendEmailOtp,
  updateProfile,
  addressButton,
  addAddress,
  postAddAddress,
  getAddress,
  updateAddress,
  deleteAddress,
};
