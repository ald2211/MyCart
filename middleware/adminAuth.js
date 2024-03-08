const isAdminAuth = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin/adminLogin");
  }
};
const isAdminAccess = (req, res, next) => {
  if (req.session.admin) {
    res.redirect("/admin");
  } else {
    next();
  }
};

module.exports = { isAdminAuth, isAdminAccess };
