const express = require("express");
const session = require("express-session");
const flash = require('connect-flash');
const dotenv = require("dotenv").config();
const path = require("path");
const passport = require("./config/passport")
const db = require("./config/db");
const MongoDBStore = require("connect-mongodb-session")(session);
const adminRouter = require("./routes/adminRouter")
const passwordRouter = require("./routes/passwordRouter");
const orderRouter = require('./routes/orderRouter')
const paymentRouter = require('./routes/payementRouter')
const { checkBlockedUser } = require('./middlewares/auth')
const Product = require('./models/productSchema')



const app = express();


db();

const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: "sessions",

});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));



app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
app.use((req, res, next) => {
    if (req.path.startsWith("/signup") || req.path.startsWith("/verify-otp")) {
        console.log(" Checking session...");
        console.log("Session OTP:", req.session.otp);
        console.log("Session User Data:", req.session.user);
    }
    next();
});
app.use(flash());

app.use(passport.initialize());
app.use(passport.session())




app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.static(path.join(__dirname, "public")));


app.use(checkBlockedUser);
const userRoutes = require("./routes/userRouter");
app.use("/", userRoutes);
app.use('/admin', adminRouter)
app.use("/", passwordRouter);
app.use('/', orderRouter)
app.use('/payment', paymentRouter)

app.get('*', async (req, res) => {
    try {
        if (req.session.admin) {
            return res.render('admin/dashboard', { username: req.session.admin });
        } else if (req.session.user) {
            const products = await Product.find().lean();
            return res.render('user/home', {
                username: req.session.user,
                products
            });
        } else {
            return res.redirect('/pageNotfound');
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send("Server Error");
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
