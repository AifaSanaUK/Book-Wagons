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
        description: String
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
    // },
    // referralCode: {  //
    //     type: String
    // },
    // redeemed: {
    //     type: Boolean,
    //     default: false
    // },
    // redeemedUsers: [{
    //     type: Schema.Types.ObjectId,
    //     ref: "User"
    // }],
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
    }]
});


const User = mongoose.model("User", userSchema);
module.exports = User;
