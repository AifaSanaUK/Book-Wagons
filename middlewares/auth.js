const User = require("../models/userSchema");

// // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      req.flash("error", "Please log in to continue.");
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user);

    if (!user) {
      req.flash("error", "User not found. Please log in.");
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    if (user.isBlocked) {
      req.flash("error", "Your account is blocked. Contact support.");
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in userAuth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ----------------------------------------------------------------------------------------------------

const checkBlockedUser = async (req, res, next) => {
  try {
    if (req.originalUrl.startsWith("/admin")) {
      return next();
    }

    if (req.session && req.session.user) {
      const user = await User.findById(req.session.user);
      if (user && user.isBlocked) {
        if (req.session) {
          req.flash("error", "Your account is blocked.");
          req.session.destroy((err) => {
            if (err) {
              console.log("Error destroying session:", err);
            }
            return res.redirect("/login");
          });
        } else {
          return res.redirect("/login");
        }
      } else {
        next();
      }
    } else {
      next();
    }
  } catch (error) {
    console.log("Error in checkBlockedUser:", error);
    next(error);
  }
};
// ----------------------------------------------------------------------------------------------------

const isLoggedIn = (req, res, next) => {
  if (req.session.user) return res.redirect("/");
  next();
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect("/admin/login");
      }
    })
    .catch((error) => {
      console.log("Error in adminAuth middlwire");
      res.status(500).send("Internal Server Error");
    });
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  userAuth,
  adminAuth,
  checkBlockedUser,
  isLoggedIn,
};
