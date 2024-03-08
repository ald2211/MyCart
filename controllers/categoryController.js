// category management

const Category = require("../Models/category");
const Product = require("../Models/product");

//----------------------------------------------- category page starts-------------------------------------------------------

//----get category page------
const getCategory = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 4;
  const totalDocumentsCount = await Category.find({}).countDocuments();
  const displayCategory = await Category.find({})
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  res.render("admin/category", {
    display: displayCategory,
    admin: true,
    pgn: pageArray,
  });
};

//----post category page------
const addCategory = async (req, res) => {
  const adding = new Category({
    name: req.body.name,
    status: true,
  });
  try {
    if (!req.body.name.trim()) {
      req.session.message = {
        type: false,
        message: "please add proper category name ",
      };
      res.redirect("/categories");
      return;
    }
    await adding.save();
    req.session.message = {
      type: true,
      message: "new category added",
    };
    res.redirect("/categories");
  } catch (err) {
    req.session.message = {
      type: false,
      message: "category already exist",
    };
    res.redirect("/categories");
  }
};

//----soft delete category ------
const unlistCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const categoryDetails = await Category.findById(id);
    categoryDetails.status = false;
    await Product.updateMany(
      { category: categoryDetails.name },
      { $set: { categoryStatus: false } }
    );
    await categoryDetails.save();
    res.redirect("/categories");
  } catch (err) {
    res.status(500).send(err);
  }
};

//list category
const listCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const categoryDetails = await Category.findById(id);
    categoryDetails.status = true;
    await Product.updateMany(
      { category: categoryDetails.name },
      { $set: { categoryStatus: true } }
    );
    await categoryDetails.save();
    res.redirect("/categories");
  } catch (err) {
    res.status(500).send(err);
  }
};

//----edit category get ------
const editCategoryGet = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Category.findById(id);
    res.render("admin/editCategory", { data });
  } catch (err) {
    res.status(500).send(err);
  }
};

//--edit category post--
const editCategoryPost = async (req, res) => {
  try {
    const id = req.params.id;
    if (!req.body.name.trim()) {
      req.session.message = {
        type: false,
        message: "please add proper category name ",
      };
      res.redirect(`/categories/edit/${id}`);
      return;
    }
    const editedCategory = await Category.findByIdAndUpdate(
      id,
      { name: req.body.name },
      { new: true }
    );
    editedCategory.save();
    req.session.message = {
      type: true,
      message: "category updated successfully",
    };
    res.redirect("/categories");
  } catch (err) {
    req.session.message = {
      type: false,
      message: "category already exist",
    };
    res.redirect("/categories");
  }
};

//----search category ------
const searchCategory = async (req, res) => {
  try {
    let searchedText = req.body.search || "";
    let sanitizingText = searchedText.replace(/[^\w\s]/gi, "");
    const pageNum = req.query.page;
    const perPage = 4;
    const totalDocumentsCount = await Category.find({
      name: { $regex: new RegExp(sanitizingText, "i") },
    }).countDocuments();
    let searchedResult = await Category.find({
      name: { $regex: new RegExp(sanitizingText, "i") },
    })
      .skip((pageNum - 1) * perPage)
      .limit(perPage);
    const totalPages = Math.ceil(totalDocumentsCount / perPage);
    const pageArray = [];
    for (let i = 1; i <= totalPages; i++) {
      pageArray.push(i);
    }
    res.render("admin/categorySearch", {
      result: searchedResult,
      admin: true,
      pgn: pageArray,
    });
  } catch (err) {
    res.status(500).send(err);
  }
};

//----------------------------------------------- category page ends-------------------------------------------------------

module.exports = {
  searchCategory,
  unlistCategory,
  listCategory,
  addCategory,
  getCategory,
  editCategoryGet,
  editCategoryPost,
};
