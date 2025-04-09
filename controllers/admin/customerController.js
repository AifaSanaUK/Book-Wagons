const User = require("../../models/userSchema");

// --------------------------------------------------------------------------------------------------------------

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 5;

    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdOn: -1 })
      .exec();
    if (userData.length === 0) {
      return res.render("admin/customers", {
        data: [],
        totalPages: 0,
        currentPage: page,
        search: search,
        noResults: true,
      });
    }
    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    });
    const totalPages = Math.ceil(count / limit);

    res.render("admin/customers", {
      data: userData,
      totalPages: totalPages,
      currentPage: page,
    });

  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).send("Internal Server Error");
  }
};
// ----------------------------------------------------------------------------------------------------------------------------------
const customerBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    console.log("Blocking customer with ID:", id);
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

    if (req.session.user && req.session.user._id === id) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });
    }

    res.redirect("/admin/customers");
  } catch (error) {
    console.error("Error blocking customer:", error);
    res.redirect("/pageerror");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------
const customerunBlocked = async (req, res) => {
  try {
    let id = req.query.id;

    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/customers");
  } catch (error) {
    console.error("Error unblocking customer:", error);
    res.redirect("/pageerror");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Internal Server Error");
    }
    res.redirect("/login");
  });
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
  logout,
};
