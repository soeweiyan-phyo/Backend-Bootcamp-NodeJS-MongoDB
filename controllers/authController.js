const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const signToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    /* To prevent cross-site scripting (xxs) attacks. */
    httpOnly: true
  };

  /* Use https only during production, otherwise cookie won't be sent during development. */
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  /* Sending cookie. */
  res.cookie("jwt", token, cookieOptions);

  /* Don't send password. */
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  /* 1) Check if email and password exist. */
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  /* 2) Check if user exists and password is correct. */
  /* Select password to show password which select property is set to false. */
  const user = await User.findOne({ email }).select("+password");

  /* Email and password checked together to prevent hacker from knowing the
     specific wrong information. */
  /* Check if password is correct by calling an instance method. */
  if (!user || !(await user.correctPassword(password, user.password))) {
    /* 401 - unauthorized. */
    return next(new AppError("Incorrect email or password", 401));
  }

  /* 3) If everything is okay, send token to client. */
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "logged out", {
    expires: new Date(Date.now + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({
    status: "success"
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  /* 1) Get token and check if it exists. */
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }

  /* 2) Verify token. */
  /* Use promisify to convert sync to async functions. */
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  /* 3) Check if user still exists. */
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists", 401)
    );
  }

  /* 4) Check if user changed password after the JWT was issued. */
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }

  /* Grant access to protected routes. */
  req.user = currentUser;
  next();
});

/* Only for render. No errors. */
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      /* 1) Verify token. */
      /* Use promisify to convert sync to async functions. */
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      /* 2) Check if user still exists. */
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      /* 3) Check if user changed password after the JWT was issued. */
      if (currentUser.passwordChangedAfter(decoded.iat)) {
        return next();
      }

      /* There is a logged in user. */
      /* Pass user data to templates. */
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

/* Using a wrapper function to pass argument into a middleware. */
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    /* roles is an array. */
    if (!roles.includes(req.user.role)) {
      return next(
        /* 403 - forbidden. */
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  /* 1) Get user based on POSTed email. */
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address", 404));
  }

  /* 2) Generate a random reset token using an instance method. */
  const resetToken = user.createPasswordResetToken();
  /* User has been modified when password reset token is created but it is not
     saved to the DB yet. */
  await user.save({ validateBeforeSave: false });

  /* 3) Send it to user's email. */
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email"
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Please try again later!",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  /* 1) Get user based on the token. */
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  /* 2) If token has not expired, and there is user, set to new password. */
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  /* 3) Update passwordChangedAt property for the user. */

  /* 4) Log the user in, send JWT. */
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    token
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  /* 1) Get user from collection. */
  const user = await User.findById(req.user._id).select("+password");

  /* 2) Check if POSTed current password is correct. */
  const correctPassword = await user.correctPassword(
    req.body.passwordCurrent,
    user.password
  );
  if (!correctPassword) {
    return next(new AppError("Your current password is incorrect", 401));
  }

  /* 3) If so, update password. */
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  /* 4) Log user in, send JWT. */
  createSendToken(user, 200, res);
});
