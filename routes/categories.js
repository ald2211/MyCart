const express = require("express");
const router = express.Router();
const { isAdminAuth, isAdminAccess } = require("../middleware/adminAuth");
const {
  getCategory,
  addCategory,
  searchCategory,
  editCategoryGet,
  editCategoryPost,
  unlistCategory,
  listCategory,
} = require("../controllers/categoryController");

//get category page
router.get("/", isAdminAuth, getCategory);

//add category
router.post("/register", addCategory);

//soft delete category
router.post("/unlist/:id", unlistCategory);
router.post("/list/:id", listCategory);

//edit category
router.get("/edit/:id", editCategoryGet);
router.post("/edit/:id", editCategoryPost);

//search category
router.post("/search", searchCategory);
module.exports = router;
