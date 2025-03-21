const mongoose = require("mongoose");
const { Schema } = mongoose;
const coupenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiryOn: {
        type: Date,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true

    },
    isList: {
        type: Boolean,
        default: true

    },
    userId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"

    }]

})
const coupen = mongoose.model("coupen", coupenSchema);
module.exports = coupen;