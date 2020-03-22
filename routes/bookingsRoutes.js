const express = require('express');
const bookingsCtrl = require('./../controllers/bookingsCtrl');
const authCtrl = require('./../controllers/authCtrl');

const router = express.Router();

router.get(
  '/checkout-session/:tourId',
  authCtrl.protect,
  bookingsCtrl.getCheckoutSession
);

module.exports = router;
