const mongoose = require("mongoose");
const slugify = require("slugify");

/* Create scheme for tour. */
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      trim: true,
      minlength: [
        10,
        "A tour name must have more than or equal to 10 characters"
      ],
      maxlength: [
        40,
        "A tour name must have less than or equal to 40 characters"
      ]
      // validate: [validator.isAlpha, "Tour name must only contain characters"]
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"]
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a max group size"]
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy, medium, or difficult"
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: val => Math.round(val * 10) / 10 // 4.6666 => 46.666 => 47 (rounded to integer) => 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"]
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          /* 'this' only points to current doc on NEW document creation. */
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below regular price"
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a summary"]
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"]
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    /* Embedded object. */
    startLocation: {
      /* GeoJSON Built-in type requires type and coordinates. */
      type: {
        type: String,
        default: "Point",
        enum: ["Point"]
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    /* To embed documents into another document, it has to be an array. */
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"]
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* Indexing to improve read performance. */
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" }); // Geo-spatial index.

/* Normal function has to be used in this case because 'this' is required. */
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

/* Virtual populate. */
tourSchema.virtual("reviews", {
  ref: "Review",
  /* Name of the reference field to tour in Review schema. */
  foreignField: "tour",
  localField: "_id"
});

/* Document middleware: runs before .save() and .create(). */
/* Slugify. */
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

/* Query middleware. */
/* REX for all that starts with 'find'. */
tourSchema.pre(/^find/, function (next) {
  /* 'this' refers to query object returned from .find(). */
  this.find({ secretTour: { $ne: true } });
  /* To calculate time taken to process a query. */
  this.start = Date.now();
  next();
});

/* Populating guides for every query. */
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt"
  });
  next();
});

/* Runs when query is completed. */
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds.`);
  console.log("No. of documents: ", docs.length);
  next();
});

/* Aggregation middleware. */
// tourSchema.pre("aggregate", function (next) {
//   /* .pipeline() returns the pipeline array and .unshift() adds at the front of an array. */
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

/* Create a model from the schema. Models' name start with uppercase. */
const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
