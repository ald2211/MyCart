// email login controller

const User = require("../Models/user");
const asyncHandler = require("express-async-handler");
const { main, otpData } = require("../emailHelper");
const randomstring = require("randomstring");
const PasswordReset = require("../Models/passwordReset");
const referalStorage = require("../Models/referral");
const checkOtpExpiration = require("../middleware/checkExperation");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const walletHistory = require("../Models/walletHs");

//-----------------------------------------------  otp entering page starts-------------------------------------------------------

//get otp
const getOtp = (req, res) => {
  res.render("users/otpEnter");
};

//post otp
const postOtp = async (req, res) => {
  try {
    const EnteredOtp = req.body.Number;
    const Bonus = await referalStorage.findOne({});

    if (
      otpData[req.session.email] &&
      EnteredOtp === otpData[req.session.email].otp
    ) {
      // OTP is valid
      delete otpData[req.session.email]; // Clear OTP data after successful verification

      const NewUser = await new User(req.session.newUser);
      const referredUser = await User.findOne(
        { Referalcode: req.session.referalLinkCode },
        { _id: 1 }
      );
      if (req.session.referalLinkCode != null) {
        NewUser.Userwallet = Bonus.newUserBonus;
        NewUser.referalUsed = true;
        NewUser.Bonus = Bonus.newUserBonus;
        await User.updateOne(
          { Referalcode: req.session.referalLinkCode },
          { $inc: { Userwallet: Bonus.referredUserBonus } }
        );
        const referredUserWallet = await new walletHistory({
          user: referredUser._id,
          date: new Date(),
          transactionType: "referal Bonus",
          amount: Bonus.referredUserBonus,
        });
        await referredUserWallet.save();
      }
      const referralCode = uuidv4();
      NewUser.Referalcode = referralCode;
      NewUser.save()
        .then(() => {
          req.session.message = {
            type: true,
            message:
              "signup success please enter your email and password to login",
          };

          res.redirect("/login");
        })
        .catch((err) => {
          throw err;
        });
    } else {
      req.session.message = {
        type: false,
        message: "wrong otp",
      };
      res.redirect("/emails/otp");
    }
  } catch (err) {
    console.log("error:", err);
    res.status(500).send(err);
  }
};
//-----------------------------------------------  otp entering page ends-------------------------------------------------------
//-----------------------------------------------  resend otp starts-------------------------------------------------------
const resendOtp = async (req, res) => {
  await main(req);
  res.redirect("/emails/otp");
};
//-----------------------------------------------  resend otp ends-------------------------------------------------------
//-----------------------------------------------  password recovery starts-------------------------------------------------------
//get forgot password page
const getForgotPassword = (req, res) => {
  res.render("users/forgotPassword");
};

//post forgot password
const postForgotPassword = async (req, res) => {
  try {
    const enteredEmail = req.body.email;
    const orginalEmail = await User.findOne({ email: enteredEmail });

    const randomString = randomstring.generate();
    const msg =
      "<p>hello" +
      orginalEmail.name +
      ',Please click  <a href="http://localhost:3000/emails/resetpassword?token=' +
      randomString +
      ' "> here </a>to reset your password</p>';
    // Delete any existing password reset entries for the user
    await PasswordReset.deleteMany({ user_id: orginalEmail._id });
    const passwordreset = new PasswordReset({
      user_id: orginalEmail._id,
      token: randomString,
    });
    await passwordreset.save();
    await main(req, orginalEmail.email, msg);
    req.session.message = {
      type: true,
      message: "a password reset link send to your mail please check",
    };
    res.redirect("/login");
  } catch (err) {
    res.status(500).send(err);
  }
};

//reset password page get
const resetPasswordGet = (req, res) => {
  const token = req.query.token;
  res.render("users/resetpassword", { token });
};

//reset password post
const resetPasswordPost = async (req, res) => {
  try {
    const newPassword = req.body.newpassword;
    const confirmedPassword = req.body.confirmedpassword;
    const tokens = req.body.token;
    if (newPassword !== confirmedPassword) {
      req.session.message = {
        type: false,
        message: "new password and confirm password donot match",
      };
      res.redirect("/emails/resetPassword");
    }
    const resetPassword = await PasswordReset.findOne().populate("user_id");
    const user = resetPassword.user_id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Save the user
    await user.save();
    await resetPassword.deleteOne({ token: tokens });
    res.redirect("/login");
  } catch (error) {
    console.error("Error in resetPasswordPost:", error);
    req.session.message = {
      type: false,
      message: "sorry An error occurred while resetting the password",
    };
    res.redirect("/emails/resetPassword");
  }
};

//-----------------------------------------------  password recovery ends-------------------------------------------------------

module.exports = {
  getOtp,
  postOtp,
  resendOtp,
  checkOtpExpiration,
  postForgotPassword,
  getForgotPassword,
  resetPasswordGet,
  resetPasswordPost,
};
