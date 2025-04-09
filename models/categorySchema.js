const mongoose = require("mongoose");
const { Schema } = mongoose;
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },

    offer: {
      type: String,
      default: "No",
    },
    offerPrice: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    status: { type: String, enum: ["Listed", "Unlisted"], default: "Listed" },
  },
  { timestamps: true },
);

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
