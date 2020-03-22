const Tour = require('./../models/toursModel');
const Booking = require('./../models/bookingsModel');
const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('./../utils/appError');

exports.getOverview = catchAsyncErr(async (req, res, next) => {
  //TODO GET TOUR DATA FROM COLLECTION
  const tours = await Tour.find();
  //TODO BUILDE TEMPLATE
  //TODO RENDER THAT TEMPLATE USING THE TOUR DATA FROM STEP 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsyncErr(async (req, res, next) => {
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
  //TODO find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  //TODO find tours with returned IDs
  const tourIDs = bookings.map(el => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});
