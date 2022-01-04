const express = require("express");
const authController = require("../controllers/authController");
const tourController = require("../controllers/tourController");
const reviewRouter = require("./reviewRoutes");

const router = express.Router();

// router.param("id", tourController.checkID);

/* Nesting routes. */
router.use("/:tourId/reviews", reviewRouter);

/* Alias route. */
router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours);

/* Aggregation pipeline. */
router.route("/tour-stats").get(tourController.getTourStats);
router
  .route("/monthly-plan/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
  );

/* /tours-within?distance=233&latlng=-40,45&unit=mi */
/* /tours-within/233/center/-40,45/unit/mi */
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

router
  .route("/")
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.createTour
  );

router
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.deleteTour
  );

module.exports = router;
