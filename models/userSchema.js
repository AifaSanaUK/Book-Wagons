const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true

    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        required: false,
        default: null
    },
    googleId: {
        type: String,
        sparse: true,

        unique: true
    }, isVerified: { type: Boolean, default: false },


    password: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],
    wallet: {
        type: Number,
        default: 0
    }, transactions: [{
        date: { type: Date, default: Date.now },
        amount: Number,
        type: { type: String, enum: ["credit", "debit"] },
        description: String,
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null }
    }],
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Wishlist"
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn: {
        type: Date,
        default: Date.now
    },

    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }],
    referralCode: { type: String, unique: true }, // User's unique referral code
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralExpiry: { type: Date, default: null }, // Who referred them
    referralReward: { type: Number, default: 0 },

});


const User = mongoose.model("User", userSchema);
module.exports = User;
