const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
// ---------------------------------------------------------------------------



const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admin/adminlogin", { message: null });
};


// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------



const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Form submitted with email:", email, "and password:", password);

        const admin = await User.findOne({ email, isAdmin: true });
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = admin._id;
                return res.redirect("/admin/dashboard");
            } else {
                return res.render("admin/adminlogin", { message: "Incorrect password!" });
            }
        } else {
            return res.render("admin/adminlogin", { message: "Admin not found!" });
        }
    } catch (error) {
        console.log("Login Error", error);
        return res.redirect('/admin/pageerror');
    }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------


const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            return res.render("admin/adminlogin", { message: "Admin not found!" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.render("admin/adminlogin", { message: "Incorrect password!" });
        }

        req.session.admin = admin._id;
        return res.redirect("/admin/dashboard");

    } catch (error) {
        console.log("Login Error", error);
        return res.redirect('/admin/pageerror');
    }
};

// ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------


const loadDashboard = async (req, res) => {
    try {
        res.render("admin/dashboard");
    } catch (error) {
        console.error("Error rendering dashboard:", error);
        res.redirect("/admin/pageerror");
    }
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const pageerror = (req, res) => {
    res.render("admin/pageerror");
};
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error while destroying session", err);
            return res.redirect("/admin/pageerror");
        }
        res.redirect("/admin/login");
    });
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
    loadLogin,
    login,
    verifyLogin,
    loadDashboard,
    pageerror,
    logout
};
