const express = require("express");
const router = express.Router();
const { isAuth, isAccess } = require("../middleware/auth");
const {
  getOtp,
  postOtp,
  checkOtpExpiration,
  resendOtp,
  postForgotPassword,
  getForgotPassword,
  resetPasswordGet,
  resetPasswordPost,
} = require("../controllers/emailController");

//otp get and post request
router.get("/otp", isAccess, getOtp);
router.post("/otp", checkOtpExpiration, postOtp);

// resend otp request
router.post("/resendOtp", resendOtp);

//password recovery
router.get("/forgotPassword", isAccess, getForgotPassword);
router.post("/forgotPassword", postForgotPassword);
router.get("/resetpassword", isAccess, resetPasswordGet);
router.post("/resetpassword", resetPasswordPost);

module.exports = router;
