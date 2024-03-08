const user = require("../Models/user");
const { v4: uuidv4 } = require("uuid");

//success full google login
const successGoogleLogin = async (req, res) => {
  console.log(req.user);
  console.log("email:", req.user.email);
  let newUser = await user.findOne({ gmail: req.user.email });
  console.log("newUser:", newUser);
  if (newUser == null) {
    let referralCode = uuidv4();
    newUser = await new user({
      name: req.user.displayName,
      gmail: req.user.email,
      Referalcode: referralCode,
    });
  }
  await newUser.save();
  if (newUser.isBlocked) {
    req.session.message = {
      type: false,
      message: "sorry your account is blocked ",
    };
    return res.redirect("/login");
  }
  req.session.isAuth = newUser._id;
  res.redirect("/home");
};

//google login failure case
const failureGoogleLogin = (req, res) => {
  req.session.message = {
    type: false,
    message: "google signin failed",
  };
  res.redirect("/login");
};

module.exports = {
  successGoogleLogin,
  failureGoogleLogin,
};
