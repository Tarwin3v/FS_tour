const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/toursModel');
const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory.js');

// =============================================================================
//                         @a MULTER / SHARP
// =============================================================================

//@q The memory storage engine stores the files in memory as Buffer objects
const multerStorage = multer.memoryStorage();

//@q Function to control which files should be uploaded and which should be skipped
const multerFilter = (req, file, callback) => {
  if (file.mimetype.startsWith('image')) {
    callback(null, true);
  } else {
    callback(
      new AppError('Not an image! Please upload only images.', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

//@q Accept a mix of files, specified by fields. An object with arrays of files will be stored in req.files
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsyncErr(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  //@q reassign uniq name to each image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  //@q resize image && mutate it to jpeg format && finally send it to public/img/tours folder
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  //@q same as before but we can receive 3 images
  //@q we initiate an image array property in our req.boy
  req.body.images = [];

  //@q returns a single Promise that fulfills when all of the promises passed as an iterable have been fulfilled
  //@q https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all

  await Promise.all(
    //@q we use map and iterate on our images array
    //@q we assign a uniq name to each image
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      //@q each image is formated to right format and sent to public/img/tours folder
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      //@q finally we push our new image name in the images array
      //@q we use map to generate a new array
      req.body.images.push(filename);
    })
  );

  next();
});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// =============================================================================
//          @a PRE FILLED FIELDS OF A QUERY TO GET TOP 5 TOURS
// =============================================================================

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// =============================================================================
//    @a FUNCTION ALLOWING TO USE AN COLLECTION AGGREGATION METHD OF MONGODB
// =============================================================================

exports.getTourStats = catchAsyncErr(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        num: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' } //
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats: stats
    }
  });
});

// =============================================================================
//    @a GEOSPATIAL FUNCTIONS
// =============================================================================
// 34.241828, -118.481800

exports.getToursWithin = catchAsyncErr(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      documents: tours
    }
  });
});

exports.getDistances = catchAsyncErr(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    { $project: { distance: 1, name: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      documents: distances
    }
  });
});
