const mongoose = require('mongoose');
const slugify = require('slugify'); //https://www.npmjs.com/package/slugify
/* const validator = require("validator"); */

// =============================================================================
// @m Tour Model Mongoose Schema https://mongoosejs.com/docs/guide.html
// =============================================================================

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true, // remove withspaces at the begining and the end
      minlength: 10,
      maxlength: 40
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0']
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points on current doc during creation phase not on updates
          return val < this.price;
        },
        message:
          'Discount price ({VALUE}) should be below than the initial price'
      }
    },

    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have an image cover']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //geoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* tourSchema.index({ price: 1 }); */
tourSchema.index({ price: 1 });
tourSchema.index({ ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function() {
  return parseFloat(this.duration / 7).toFixed(1);
});

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// =============================================================================
// @MIDDLEWARES https://mongoosejs.com/docs/middleware.html
// =============================================================================

// DOC MIDDELWARE
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lowercase: true });
  next();
});
/* 
tourSchema.pre("save", async function(next) {
  const guidesPromises = this.guides.map(async id => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
});
 */
// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});
tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });

  next();
});
/* tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${(Date.now() - this.start) / 1000}s`);
  console.log("DOC QUERY START--------------------------");
  console.log(docs);
  console.log("------------------DOC QUERY END");
  next();
}); */

// AGGREGATION MIDDLEWARE
/* tourSchema.pre("aggregate", function(next) {
  console.log(this);
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
}); */

// =============================================================================
// @CREATION OF TOUR model ON tourSchema https://mongoosejs.com/docs/models.html
// =============================================================================
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
