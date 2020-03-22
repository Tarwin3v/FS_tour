const express = require('express');
const toursCtrl = require('./../controllers/toursCtrl');
const authCtrl = require('../controllers/authCtrl');
const reviewsRoute = require('./reviewsRoutes.js');

const router = express.Router();

/* router.param("id", toursCtrl.checkID); */

router.use('/:tourId/reviews', reviewsRoute);

router
  .route('/top-5-cheap')
  .get(toursCtrl.aliasTopTours, toursCtrl.getAllTours);

router.route('/tours-stats').get(toursCtrl.getTourStats);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(toursCtrl.getToursWithin);
// tours-distance?distance=233&center=-40,45&unit=mi
// tours-distance/223/center/-34.241828,-118.481800/unit/mi

router.route('/distances/:latlng/unit/:unit').get(toursCtrl.getDistances);

router
  .route('/')
  .get(toursCtrl.getAllTours)
  .post(
    authCtrl.protect,
    authCtrl.restrictTo('admin', 'lead-guide'),
    toursCtrl.createTour
  );

router
  .route('/:id')
  .get(toursCtrl.getTour)
  .patch(
    authCtrl.protect,
    authCtrl.restrictTo('admin', 'lead-guide'),
    toursCtrl.uploadTourImages,
    toursCtrl.resizeTourImages,
    toursCtrl.updateTour
  )
  .delete(
    authCtrl.protect,
    authCtrl.restrictTo('admin', 'lead-guide'),
    toursCtrl.deleteTour
  );

module.exports = router;
