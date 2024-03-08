const express = require("express");
const router = express.Router();
const { isAdminAuth, isAdminAccess } = require("../middleware/adminAuth");
const upload = require("../helperFuctions");
const {
  adminHome,
  adminLogin,
  adminLoginPost,
  adminLogout,
  userManagement,
  blockUser,
  unblockUser,
  searchUser,
  showSearchResults,
} = require("../controllers/adminController");
const {
  getCoupen,
  addCoupen,
  deleteCoupen,
  editCoupenGet,
  editCoupenPost,
} = require("../controllers/coupenController");
const {
  getBanner,
  postBanner,
  deleteBanner,
} = require("../controllers/bannerController");
const {
  getCharges,
  editFixedCharge,
  editPriceRange,
  paymentPolicy,
} = require("../controllers/deliveryChargeController");
const {
  getMangageReferral,
  editNewUserBonus,
  editReferredUserBonus,
} = require("../controllers/walletController");
/* Admin home get request */
router.get("/", isAdminAuth, adminHome);

/* Admin login get and post request */
router.get("/adminLogin", isAdminAccess, adminLogin);
router.post("/adminLogin", adminLoginPost);

/* user management page */
router.get("/manageUser", isAdminAuth, userManagement);
router.get("/searchUserResults", isAdminAuth, showSearchResults);
router.post("/searchUser", isAdminAuth, searchUser);
router.post("/block/:id", blockUser);
router.post("/unblock/:id", unblockUser);
/*coupen management*/
router.get("/coupen", isAdminAuth, getCoupen);
router.post("/coupons/add", addCoupen);
router.delete("/coupen/delete", deleteCoupen);
router.get("/coupen/editCoupen/:id", isAdminAuth, editCoupenGet);
router.post("/coupen/editCoupen", editCoupenPost);

/*deliveryCharge management*/
router.get("/charges", isAdminAuth, getCharges);
router.post("/editFixedCharge", editFixedCharge);
router.post("/editPriceRange", editPriceRange);
/*banner management*/
router.get("/banner", isAdminAuth, getBanner);
router.post("/uploadBanner", upload.single("image"), postBanner);
router.delete("/deleteBanner", deleteBanner);

/*referal management*/
router.get("/referal", isAdminAuth, getMangageReferral);
router.post("/editNewUserBonus", editNewUserBonus);
router.post("/editReferredUserBonus", editReferredUserBonus);

/*paymentPolicy*/
router.get("/paymentPolicy", paymentPolicy);

/* Admin logout */
router.get("/adminLogout", isAdminAuth, adminLogout);

module.exports = router;
