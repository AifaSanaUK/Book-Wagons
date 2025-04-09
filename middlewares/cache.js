const preventCache = (req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};
// -------------------------------------------------------------------------------------------------------
const isAdmin = (req, res, next) => {
  if (req.session.admin) {
    return next();
  } else {
    return res.redirect("/admin/login");
  }
};
// -------------------------------------------------------------------------------------------------------

module.exports = {
  preventCache,
  isAdmin,
};
