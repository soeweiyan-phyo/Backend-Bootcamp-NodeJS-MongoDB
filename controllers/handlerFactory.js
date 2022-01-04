const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    /* To allow for nested GET all reviews on tour. */
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    /* Execute query. */
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;

    /* Send response. */
    res.status(200).json({
      status: "success",
      results: doc.length,
      /* If key and data have same names, then only need to put the data. */
      data: { data: doc }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: { data: doc }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res) => {
    /* Create new tour in the database. */
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: { data: doc }
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    /* Find a document by ID and update its properties. Then return new
     document that is updated. */
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: { data: doc }
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    /* Find a document by ID and delete. */
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      next(new AppError("No document found with that ID", 404));
    }

    /* Return NTH. 204 (No Content). */
    res.status(204).json({
      status: "success",
      data: null
    });
  });
