const stripe = require('stripe')(process.env.STRIPE_SK);
const Tour = require('./../models/toursModel');
const Booking = require('./../models/bookingsModel');

const catchAsyncErr = require('./../utils/catchAsyncErr');

exports.getCheckoutSession = catchAsyncErr(async (req, res, next) => {
  //TODO get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  console.log(tour);

  //TODO create checkout session
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
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  });
  //TODO create session as response
  res.status(200).json({
    status: 'success',
    session: session
  });
});

exports.createBookingCheckout = catchAsyncErr(async (req, res, next) => {
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});
