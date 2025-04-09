const Banner = require("../../models/bannerSchema");
const moment = require("moment");

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const getBannerPage = async (req, res) => {
  try {
    const findBanner = await Banner.find({});
    res.render("admin/banner", { data: findBanner });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const getAddBannerPage = async (req, res) => {
  try {
    res.render("admin/addBanner");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const addBanner = async (req, res) => {
  try {

    const data = req.body;
    const image = req.file;

    if (!data.startDate || !data.endDate) {
      return res.status(400).send("Start date and end date are required.");
    }
    const startDate = moment(data.startDate, "DD-MM-YY").format("YYYY-MM-DD");
    const endDate = moment(data.endDate, "DD-MM-YY").format("YYYY-MM-DD");



    if (
      !moment(startDate, "YYYY-MM-DD", true).isValid() ||
      !moment(endDate, "YYYY-MM-DD", true).isValid()
    ) {
      return res.status(400).send("Invalid date format");
    }

    const newBanner = new Banner({
      image: image.filename,
      title: data.title,
      description: data.description,
      startDate: startDate,
      endDate: endDate,
      createdAt: new Date(),
    });

    await newBanner.save();

    res.redirect("/admin/banner");
  } catch (error) {

    res.redirect("/admin/pageerror");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------
// delete banner

const deleteBanner = async (req, res) => {
  try {
    const id = req.query.id;
    await Banner.deleteOne({ _id: id }).then((data) => console.log(data));
    res.redirect("/admin/banner");
  } catch (error) {
    res.redirect("/admin/pagerror");
  }
};
// --------------------------------------------------------------------------------------------------------------------------------------------
module.exports = {
  getBannerPage,
  getAddBannerPage,
  addBanner,
  deleteBanner,
};
