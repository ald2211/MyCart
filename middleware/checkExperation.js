//expiration time handle middleware
const { otpData } = require("../emailHelper");
const checkOtpExpiration = (req, res, next) => {
  const email = req.session.email;

  if (otpData[email] && otpData[email].expirationTime < new Date().getTime()) {
    // OTP has expired
    delete otpData[email];
    req.session.verified = false;
    req.session.message = {
      type: false,
      message: "OTP expired. Please request a new one.",
    };
    return res.redirect("/emails/otp");
  }

  next();
};

module.exports = checkOtpExpiration;
