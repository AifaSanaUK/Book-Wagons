const User = require("../models/userSchema");

// // --------------------------------------------------------------------------------------------------------------------------------------------------------------------


const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.user);
        if (!user || user.isBlocked) {
            return res.redirect("/login");
        }

        req.user = user;
        next();
    } catch (error) {
        console.log("Error in userAuth middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const adminAuth = (req, res, next) => {
    User.findOne({ isAdmin: true })
        .then(data => {
            if (data) {
                next()
            } else {
                res.redirect("/admin/login")
            }
        })
        .catch(error => {
            console.log("Error in adminAuth middlwire")
            res.status(500).send("Internal Server Error")
        })
}
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
    userAuth,
    adminAuth
}