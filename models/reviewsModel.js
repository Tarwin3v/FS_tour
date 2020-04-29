const mongoose = require('mongoose');
const Tour = require('./toursModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
      required: [true, 'A review cannot be empty!']
    },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.']
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

//@d create an index to make the combination of each tour && user unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//@d find pre middleware , will populate user with name and photo
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

//@q static function usable in our model
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  //@q https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/#examples

  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  //@d if stats isnt empty query for tour && and update with ratingsQuantity && ratingsAverage
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    //@d default query
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

//@q post middleware on save trigger on create action
//@q we use post because the current review with pre isnt in the collection at this point so we have to wait the creation of the doc
reviewSchema.post('save', function() {
  //@q"this" point to the current review
  //@q this.constructor point to the model
  this.constructor.calcAverageRatings(this.tour);
});

//@q pre middleware trigger by all the queries who start by findOneAnd
reviewSchema.pre(/^findOneAnd/, async function(next) {
  //@q this is a current query who is being processed by the model
  this.r = await this.findOne();
  //@q we append r with the doc to our this object

  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  //@q we finally use this r to calculate the average Rating after the data got persisted in db
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
