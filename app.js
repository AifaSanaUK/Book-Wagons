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
    if (req.path.startsWith("/signup") || req.path.startsWith("/verify-otp")) {
        console.log(" Checking session...");
        console.log("Session OTP:", req.session.otp);
        console.log("Session User Data:", req.session.user);
    }
    next();
});
app.use(flash());
// app.use((req, res, next) => {
//     console.log('Session:', req.session);
//     console.log('Session ID:', req.sessionID);
//     next();
// });

app.use(passport.initialize());
app.use(passport.session())




app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.static(path.join(__dirname, "public")));



const userRoutes = require("./routes/userRouter");
app.use("/", userRoutes);
app.use('/admin', adminRouter)
app.use("/", passwordRouter);
app.use('/', orderRouter)


const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
