const stripe = require('stripe')(process.env.STRIPE_SK);
const Tour = require('./../models/toursModel');
const Booking = require('./../models/bookingsModel');

const catchAsyncErr = require('./../utils/catchAsyncErr');

// =============================================================================
//                         @a CHECKOUT SESSION
// =============================================================================

exports.getCheckoutSession = catchAsyncErr(async (req, res, next) => {
  //@d query tour with tourId
  const tour = await Tour.findById(req.params.tourId);

  //@q create checkout session of stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [],
        amount: tour.price * 100,
        currency: 'eu',
        quantity: 1
      }
    ]
  });
  //@q send session to client
  res.status(200).json({
    status: 'success',
    session: session
  });
});

// =============================================================================
//                         @a CREATE BOOKING CHECKOUT
// =============================================================================

exports.createBookingCheckout = catchAsyncErr(async (req, res, next) => {
  //@q deconstruct our data from req.query
  const { tour, user, price } = req.query;
  //@q check exist state
  if (!tour && !user && !price) return next();
  //@q persist the data in db
  await Booking.create({ tour, user, price });
  //@q remove params from the query and redirect to the originalUrl // https://expressjs.com/fr/api.html#req
  res.redirect(req.originalUrl.split('?')[0]);
});
