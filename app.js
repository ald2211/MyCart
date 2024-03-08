require("dotenv").config();

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const multer = require("multer");
const session = require("express-session");
const mongoose = require("mongoose");
const exphbs = require("hbs");

var app = express();
//database
mongoose
  .connect(process.env.CONNECTION)
  .then(() => {
    console.log("Database connected successfully....");
  })
  .catch((err) => {
    console.log(err);
  });

//routes
var userRouter = require("./routes/users");
var adminRouter = require("./routes/admin");
const productRouter = require("./routes/products");
const categoryRouter = require("./routes/categories");
const orderRouter = require("./routes/orders");
const emailRouter = require("./routes/emails");

const storage = multer.memoryStorage(); // Use memory storage for storing image data in Buffer
const upload = multer({ storage: storage });

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
// Register partials directory
exphbs.registerPartials(path.join(__dirname, "views/partials"));

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//session for all routes
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
// Add these lines at the beginning of your main app file
app.use((req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
});

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

app.use("/admin", adminRouter);
app.use("/products", productRouter);
app.use("/categories", categoryRouter);
app.use("/orders", orderRouter);
app.use("/emails", emailRouter);
app.use("/", userRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
