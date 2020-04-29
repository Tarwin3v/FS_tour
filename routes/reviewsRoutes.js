const express = require('express');
const reviewsCtrl = require('./../controllers/reviewsCtrl');
const authCtrl = require('../controllers/authCtrl');

//@q merge params sent by tour router // http://expressjs.com/fr/api.html#express.router
const router = express.Router({ mergeParams: true });

router.use(authCtrl.protect);

router
  .route('/')
  .get(reviewsCtrl.getAllReviews)
  .post(
    authCtrl.restrictTo('user'),
    reviewsCtrl.setTourUserIds,
    reviewsCtrl.createReview
  );

router
  .route('/:id')
  .get(reviewsCtrl.getReview)
  .patch(authCtrl.restrictTo('user', 'admin'), reviewsCtrl.updateReview)
  .delete(authCtrl.restrictTo('user', 'admin'), reviewsCtrl.deleteReview);

module.exports = router;
