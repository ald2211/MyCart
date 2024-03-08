const isAuth = (req, res, next) => {
  if ((req.session.isAuth || req.session.verified) && !req.session.blocked) {
    next();
  } else {
    res.redirect("/login");
  }
};
const isAccess = (req, res, next) => {
  if ((req.session.isAuth || req.session.verified) && !req.session.blocked) {
    res.redirect("/home");
  } else {
    next();
  }
};

module.exports = { isAuth, isAccess };
