const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewsRoutes = require("./routes/viewsRoutes");

const app = express();

/* Setting up pug. */
app.set("view engine", "pug");
/* Where template files are located. */
app.set("views", path.join(__dirname, "views"));

/* 1) Global Middlewares. */
/* Serving static files. */
app.use(express.static(path.join(__dirname, "public")));

/* Set security HTTP headers. */
app.use(helmet());

/* Development logging. */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* Limit request rates from same IP to prevent DOS and brute force attacks */
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!"
});
app.use(limiter);

/* Body parser, reading data from into req.body. */
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

/* Data sanitization against NoSQL query injection. */
app.use(mongoSanitize());

/* Data sanitization against XSS. */
app.use(xss());

/* Prevent parameter pollution. */
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price"
    ]
  })
);

/* Test middleware. */
app.use((req, res, next) => {
  console.log(req.cookies);
  next();
});

/* 2) ROUTES */
/* Mounting routers on routes. */
app.use("/", viewsRoutes);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

/* Handle all unhandled routes. */
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

/* Global error handling middleware. */
app.use(globalErrorHandler);

module.exports = app;
