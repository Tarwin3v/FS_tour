const Review = require('../models/reviewsModel.js');
const factory = require('./handlerFactory.js');

exports.setTourUserIds = (req, res, next) => {
  //@q we put our params data in req.body.tour && req.body.user we use req.body for our req to db in handleFactory
  if (!req.body.tour) req.body.tour = req.params.tourId;
  //@q get req.user from protect middleware
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
