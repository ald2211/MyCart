const express = require("express");
const router = express.Router();
const passport = require("../passport");
const { isAuth, isAccess } = require("../middleware/auth");
const {
  successGoogleLogin,
  failureGoogleLogin,
} = require("../controllers/googleAuthController");
const {
  userLogin,
  userLoginPost,
  userHome,
  userSignup,
  userSignupPost,
  invalidRequest,
  userLogout,
  zoomProduct,
  userSearch,
  userProfile,
  editUserProfile,
  editUserProfilePost,
  resetPasswordGet,
  resetPasswordPost,
  addressGet,
  addAddress,
  submitAddress,
  editAddressGet,
  editAddressPost,
  deleteAddress,
  userCartGet,
  addToCart,
  removeFromCart,
  updateQuantity,
  buyProdcut,
  getInvoice,
  applyCoupen,
  getCategoryFilter,
  postCategoryFilter,
  public,
} = require("../controllers/userController");
const {
  getWalletPage,
  referalFromWalletPage,
  walletHistory,
} = require("../controllers/walletController");
const upload = require("../helperFuctions");
//google sign in

router.use(passport.initialize());
router.use(passport.session());
//get Auth
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

//auth cllback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/success",
    failureRedirect: "/failure",
  })
);
//success
router.get("/success", successGoogleLogin);
router.get("/failure", failureGoogleLogin);

/* GET home page. */
router.get("/home", isAuth, userHome);

//get and post signup page
router.get("/signup", isAccess, userSignup);

router.post("/submit", userSignupPost);

//get and post for login page
router.get("/login", isAccess, userLogin);

router.post("/login", userLoginPost);

//zoom product
router.get("/productDetails/:id", isAuth, zoomProduct);

//product search by user
router.post("/searchUser", isAuth, userSearch);

//user Profile
router.get("/profile", isAuth, userProfile);
router.get("/editProfile/:id", isAuth, editUserProfile);
router.post("/editProfile/:id", upload.single("image"), editUserProfilePost);
router.get("/reset", isAuth, resetPasswordGet);
router.post("/reset/:id", resetPasswordPost);
router.get("/address", isAuth, addressGet);
router.get("/addAddress", isAuth, addAddress);
router.post("/submitAddress", submitAddress);
router.get("/editAddress/:id", isAuth, editAddressGet);
router.post("/editAddress/:id", editAddressPost);
router.post("/deleteAddress/:id", deleteAddress);

//user Cart
router.get("/cart", isAuth, userCartGet);
router.post("/addToCart/:id", addToCart);
router.post("/cartItemRemove/:id", removeFromCart);
router.put("/updateQuantity/:id", updateQuantity);

//buy product
router.get("/buy", isAuth, buyProdcut);

//invoice
router.get("/invoice/:id", isAuth, getInvoice);

// apply coupen
router.post("/coupen/apply", applyCoupen);

//category wise filtered
router.get("/filterCategory", isAuth, getCategoryFilter);
router.post("/filterCategory", postCategoryFilter);

//public view
router.get("/", isAccess, public);

//get wallet Page
router.get("/getWallet", isAuth, getWalletPage);
router.post("/applyReferal", referalFromWalletPage);
router.get("/walletHistory/:id", isAuth, walletHistory);

//user logout
router.get("/logout", isAuth, userLogout);

//invalid route request
router.get("*", invalidRequest);

module.exports = router;
