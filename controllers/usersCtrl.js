const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/usersModel');
const factory = require('./handlerFactory.js');
const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('../utils/appError');

// =============================================================================
//                         @a MULTER / SHARP
// =============================================================================

const multerStorage = multer.memoryStorage();

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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsyncErr(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

// =============================================================================
//                        @a FILTERED OBJ
// =============================================================================

const filterObj = (obj, ...allowedFields) => {
  //@q empty obj that we will return
  const newObj = {};
  //@q we iterate on the array returned by Object.keys(obj)
  Object.keys(obj).forEach(el => {
    //@q if our el is present in our allowed fields we put it in our new object
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.getMe = (req, res, next) => {
  //@q to be able to use getOne in factory
  req.params.id = req.user.id;
  next();
};
// =============================================================================
//                            @a UPDATE USER
// =============================================================================

exports.updateMe = catchAsyncErr(async (req, res, next) => {
  //@q we handle password update in our authCtrl
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password update . Please use UpdateMyPassword',
        400
      )
    );
  }
  //@q we filter our req.body object to get only the name && email fields

  const filteredBody = filterObj(req.body, 'name', 'email');

  //@q if we have a file in our req we append a photo property to our filteredBody object
  if (req.file) filteredBody.photo = req.file.filename;

  //@d we query our user in db with his id && send filteredBody object to db

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// =============================================================================
//                         @a DELETE USER
// =============================================================================

exports.deleteMe = catchAsyncErr(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});
