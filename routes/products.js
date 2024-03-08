const express = require("express");
const router = express.Router();
const { isAdminAuth, isAdminAccess } = require("../middleware/adminAuth");
const {
  deleteProduct,
  updateProductGet,
  updateProductPost,
  addProductGet,
  addProductPost,
  productHome,
  searchProduct,
  stockGet,
  stockPost,
  stockClear,
  editStockGet,
  editStockPut,
  deleteImage,
  unBlockProduct,
  cropImageGet,
  cropImagePost,
} = require("../controllers/productController");
const {
  offerGet,
  offerPost,
  editOfferGet,
  editOffer,
  deleteOffer,
} = require("../controllers/offerController");
const upload = require("../helperFuctions");

//product management home
router.get("/", isAdminAuth, productHome);

//proudct page get and post requests
router.get("/addProduct", isAdminAuth, addProductGet);

router.post("/addProduct", upload.array("image", 5), addProductPost);

//edit product
router.get("/editProduct/:id", isAdminAuth, updateProductGet);
router.post("/updateProduct/:id", upload.array("image", 5), updateProductPost);

//search products
router.post("/search", searchProduct);

//delete Products
router.post("/deleteProduct/:Id", deleteProduct);
router.post("/unBlockProduct/:Id", unBlockProduct);

//delete product image
router.delete("/deleteImage", deleteImage);

//manage stocks
router.get("/stock", isAdminAuth, stockGet);
router.post("/stock", stockPost);
router.patch("/clearStock/:id", stockClear);
router.get("/editStock/:id", isAdminAuth, editStockGet);
router.put("/editStock/:id", editStockPut);

// Product offer
router.get("/offer", isAdminAuth, offerGet);
router.post("/offer", offerPost);
router.get("/editOffer/:id", isAdminAuth, editOfferGet);
router.put("/editOffer", editOffer, editOffer);
router.delete("/deleteOffer", deleteOffer);

//crop image
router.get("/cropImage/:id", isAdminAuth, cropImageGet);
router.post("/updateImage", cropImagePost);

module.exports = router;
