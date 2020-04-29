const Tour = require('./../models/toursModel');
const Booking = require('./../models/bookingsModel');
const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('./../utils/appError');

exports.getOverview = catchAsyncErr(async (req, res, next) => {
  //@d we get data from db
  const tours = await Tour.find();
  //@q we send data to client into a specific template here overview
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsyncErr(async (req, res, next) => {
  //@d we get data with the slug as parameter sent by the details button in our template
  //@d we populate the reviews of the tour , here we need the review , rating, and the user
  //@q https://mongoosejs.com/docs/populate.html#population

  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    return next(new AppError('There is not tour with that name.', 404));
  }
  res.status(200).render('tour', {
    title: tour.name,
    tour
  });
});

exports.getLogin = catchAsyncErr(async (req, res, next) => {
  res.status(200).render('login', {
    title: 'Log in'
  });
});

exports.getSignUp = catchAsyncErr(async (req, res, next) => {
  res.status(200).render('signup', {
    title: 'Sign Up'
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getMyTours = catchAsyncErr(async (req, res, next) => {
  //@d we query our bookings with the user id that we get from our protect middleware
  //@d when we use find query our pre('find') middleware in our booking  model is triggered
  //@d that pre middleware will populate user data && tour name

  const bookings = await Booking.find({ user: req.user.id });

  //Data format in bookings
  /*  
  id:5e3965fd7aa11b1be66becbe
  createdAt:2020-02-04T12:34:42.686+00:00
  paid:true
  tour:5c88fa8cf4afda39709c295d //@d needed for our query
  user:5e384cc9c5507756917a1c0a
  price:1197
    */

  //@d Runs a function fn and treats the return value of fn as the new value for the query to resolve to
  //@q https://mongoosejs.com/docs/api.html#query_Query-map
  const tourIDs = bookings.map(el => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});
