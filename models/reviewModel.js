const mongoose = require("mongoose");
const Tour = require("./tourModel");
const AppError = require("../utils/appError");

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review can not be empty"]
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating must be equal to or above 0"],
      max: [5, "Rating must be equal to or below 5"]
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"]
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"]
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* Only one review can be written by one user for one tour. */
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

/* Populate tour and user. */
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo"
  });
  next();
});

/* Function to calculate ratings average and quantity. */
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" }
      }
    }
  ]);

  console.log(stats);

  /* Update ratings average and quantity in tour. */
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

/* Middleware to calculate ratings average. */
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.tour);
});

/* findByIdAndUpdate */
/* findById is short hand for FindOne({ id }) */
/* findByIdAndDelete */
reviewSchema.pre(/^findOneAnd/, async function (next) {
  /* Store in current review to pass it from pre to post query middleware. */
  /* findOne() to get the current review. */
  this.r = await this.findOne();
  console.log(this.r);
  if (!this.r) {
    next(new AppError("No review found with that ID", 404));
  }
});

reviewSchema.post(/^findOneAnd/, async function () {
  /* await this.findOne() does not work here because query is already executed. */
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
