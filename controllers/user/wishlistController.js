const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require("mongoose");
const Category = require('../../models/categorySchema')

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// ----------------------------------------------------------------------------------------------------------------------------------


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const categories = await Category.find({}, '_id name');


        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId',
            populate: { path: 'category', select: '_id name' }
        });

        if (!wishlist || wishlist.items.length === 0) {
            return res.render('user/wishlist', { wishlist: [], userId, categories });
        }


        res.render('user/wishlist', { wishlist: wishlist.items, userId, categories });

    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.status(500).json({ error: 'Failed to load wishlist' });
    }
};
// ----------------------------------------------------------------------------------------------------------------------------------


// const addToWishlist = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId } = req.body;

//         if (!userId) {
//             return res.status(401).json({ success: false, message: 'User not logged in' });
//         }

//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }
//         if (product.quantity <= 0) {
//             return res.status(400).json({ success: false, message: 'Product is out of stock' });
//         }

//         let wishlist = await Wishlist.findOne({ userId });

//         if (!wishlist) {
//             wishlist = new Wishlist({ userId, items: [] });
//         }
//         const alreadyExists = wishlist.items.some(item =>
//             item.productId.toString() === productId
//         );

//         if (alreadyExists) {
//             return res.json({ success: false, message: 'Product already in wishlist' });
//         }


//         wishlist.items.push({
//             productId: product._id,
//             name: product.productName,
//             productImage: product.productImage[0], 
//             category: product.category,
//             price: product.salePrice
//         });

//         await wishlist.save();
//         res.json({ success: true, message: 'Added to wishlist' });

//     } catch (error) {
//         console.error('Error adding to wishlist:', error);
//         res.status(500).json({ success: false, message: 'Error adding product to wishlist' });
//     }
// }
const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Product is out of stock' });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        const alreadyExists = wishlist.items.some(item =>
            item.productId.toString() === productId
        );

        if (alreadyExists) {
            return res.status(400).json({ success: false, message: 'Product already in wishlist' });
        }

        wishlist.items.push({
            productId: product._id,
            name: product.productName,
            productImage: product.productImage[0],
            category: product.category,
            price: product.salePrice
        });

        await wishlist.save();
        res.json({ success: true, message: 'Added to wishlist' });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ success: false, message: 'Error adding product to wishlist' });
    }
};


// ----------------------------------------------------------------------------------------------------------------------------------
const removeFromWishlist = async (req, res) => {
    const { userId, productId } = req.body;

    console.log(`Request received to remove product: ${productId} for user: ${userId}`);

    try {

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId' });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid productId' });
        }
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        const itemIndex = wishlist.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }


        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();

        console.log(`Product ${productId} removed successfully for user ${userId}`);

        res.status(200).json({ message: 'Item removed from wishlist', wishlist });
    } catch (error) {
        console.error('Error in removeFromWishlist:', error);
        res.status(500).json({ error: error.message });
    }
};


// ----------------------------------------------------------------------------------------------------------------------------------



const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId');

        if (!wishlist || wishlist.items.length === 0) {
            return res.render('wishlist', { wishlist: [] });
        }
        const wishlistItems = wishlist.items.map(item => ({
            productId: item.productId._id,
            name: item.name,
            image: item.productImage,
            category: item.category,
            price: item.price
        }));

        res.render('user/wishlist', { wishlist: wishlistItems, userId });

    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ success: false, message: 'Error fetching wishlist' });
    }
};

// ----------------------------------------------------------------------------------------------------------------------------------

module.exports = { loadWishlist, addToWishlist, removeFromWishlist, getWishlist };