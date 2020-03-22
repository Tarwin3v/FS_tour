const express = require('express');
const viewsCtrl = require('./../controllers/viewsCtrl');
const authCtrl = require('./../controllers/authCtrl');
const bookingsCtrl = require('./../controllers/bookingsCtrl');

const router = express.Router();

router.get(
  '/',
  bookingsCtrl.createBookingCheckout,
  authCtrl.isLoggedIn,
  viewsCtrl.getOverview
);
router.get('/tour/:slug', authCtrl.isLoggedIn, viewsCtrl.getTour);
router.get('/login', authCtrl.isLoggedIn, viewsCtrl.getLogin);
router.get('/signup', authCtrl.isLoggedIn, viewsCtrl.getSignUp);
router.get('/me', authCtrl.protect, viewsCtrl.getAccount);
router.get('/my-tours', authCtrl.protect, viewsCtrl.getMyTours);

module.exports = router;
