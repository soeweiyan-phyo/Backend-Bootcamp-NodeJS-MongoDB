const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"]
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"]
  },
  photo: String,
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user"
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      /* This only works on CREATE and SAVE!!! */
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!"
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

/* Document middleware. */
userSchema.pre("save", async function (next) {
  /* Only run this function if password was actually modified. */
  if (!this.isModified("password")) return next();

  /* Hash password with cost of 12. */
  this.password = await bcrypt.hash(this.password, 12);

  /* Delete passwordConfirm field. We only need to it validate user input. */
  this.passwordConfirm = undefined;
  next();
});

/* Setting passwordChangedAt date and time. */
userSchema.pre("save", function (next) {
  /* Only if password is modified and document is not new. */
  if (!this.isModified("password") || this.isNew) return next();
  /* Make the time a second earlier because JWT is issued quicker than document saving */
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

/* Query middleware - to only shows users who are active. */
userSchema.pre(/^find/, function (next) {
  /* this - points to the current query. */
  this.find({ active: { $ne: false } });
  next();
});

/* Instance method. Available on all user documents. */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/* Instance method - check if password has changed after JWT token was issued. */
userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    /* Divide by 1000 to convert to seconds and parse it to Integer with base 10. */
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  /* FALSE means password was not changed. */
  return false;
};

/* Create a random password reset token. */
userSchema.methods.createPasswordResetToken = function () {
  /* Reset token is like a password to get access to database 
     to change the actual password. */
  const resetToken = crypto.randomBytes(32).toString("hex");

  /* Encrypt the reset token and store it in the database. We only store
     encrypted version of sensitive data in the DB similar to password. */
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  /* Password reset token expires in 10 minutes (in milliseconds). */
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  /* Return the plaintext version of the token. */
  return resetToken;
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
