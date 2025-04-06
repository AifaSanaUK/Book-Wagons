
const Coupon = require('../../models/couponSchema');

// ----------------------------------------------------------------------------------------------------

const loadCoupon = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = 3;


        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);


        const coupons = await Coupon.find()
            .skip((page - 1) * limit)
            .limit(limit);


        const currentDate = new Date();
        coupons.forEach(async (coupon) => {
            if (new Date(coupon.expiryOn) < currentDate) {
                if (coupon.isList !== false) {
                    await Coupon.findByIdAndUpdate(coupon._id, { isList: false });
                }
            }
        });

        res.render('admin/loadCoupon', {
            coupons,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
};


// ----------------------------------------------------------------------------------------------------

const createCoupon = async (req, res) => {
    try {
        const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
        console.log(req.body);

        const existingCoupon = await Coupon.findOne({ name: couponName.trim().toUpperCase() });

        if (existingCoupon) {
            return res.json({ success: false, message: 'Coupon already exists!' });
        }


        const offerPriceNum = parseFloat(offerPrice);
        const minimumPriceNum = parseFloat(minimumPrice);

        const newCoupon = new Coupon({
            name: couponName.trim().toUpperCase(),
            createdOn: new Date(startDate),
            expiryOn: new Date(endDate),
            offerPrice: offerPriceNum,
            minimumPrice: minimumPriceNum,
            isList: true,
        });


        await newCoupon.save();
        return res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        return res.json({ success: false, message: 'Error creating coupon.' });
    }
};

// ----------------------------------------------------------------------------------------------------


const editCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.status(200).json({
            success: true,
            coupon: {
                _id: coupon._id,
                name: coupon.name,
                createdOn: coupon.createdOn.toISOString().split('T')[0],
                expiryOn: coupon.expiryOn.toISOString().split('T')[0],
                offerPrice: coupon.offerPrice,
                minimumPrice: coupon.minimumPrice
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// ----------------------------------------------------------------------------------------------------

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;


        const existingCoupon = await Coupon.findOne({
            name: couponName,
            _id: { $ne: id }
        });

        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Coupon name already exists!' });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(id, {
            name: couponName,
            createdOn: startDate,
            expiryOn: endDate,
            offerPrice,
            minimumPrice: minimumPrice || 0
        }, { new: true });

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// ----------------------------------------------------------------------------------------------------

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// ----------------------------------------------------------------------------------------------------

module.exports = {
    loadCoupon,
    createCoupon,
    updateCoupon,
    editCoupon,
    deleteCoupon
}