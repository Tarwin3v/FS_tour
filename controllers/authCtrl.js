const crypto = require('crypto'); //https://nodejs.org/docs/latest-v8.x/api/crypto.html
const { promisify } = require('util'); //https://nodejs.org/docs/latest-v8.x/api/util.html
const jwt = require('jsonwebtoken'); //https://github.com/auth0/node-jsonwebtoken
const User = require('./../models/usersModel');
const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    //https://github.com/auth0/node-jsonwebtoken
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  //remove password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  });
};

// =============================================================================
//                         @o SIGN UP
// =============================================================================

exports.signUp = catchAsyncErr(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });
  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

// =============================================================================
//                         @o LOGIN
// =============================================================================

exports.logIn = catchAsyncErr(async (req, res, next) => {
  const { email, password } = req.body;

  //TODO check email / password existence
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //TODO check if user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //TODO if everything ok , send token to client
  createSendToken(user, 200, res);
});

// =============================================================================
//                         @o LOG OUT
// =============================================================================

exports.logOut = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};
// =============================================================================
//                         @o LOGGED IN
// =============================================================================

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    // TODO VERFICATION TOKEN
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // TODO CHECK IF USER STILL EXISTS

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // TODOCHECK IF USER CHANGE PASSWORD AFTER THE TOKEN WAS DELIVERED
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // TODO THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// =============================================================================
//                         @o PROTECT
// =============================================================================

exports.protect = catchAsyncErr(async (req, res, next) => {
  let token;
  // TODO GETTING TOKEN AND CHECK
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }
  // TODO VERFICATION TOKEN
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log('=====================================');
  console.log(decoded);

  // TODO CHECK IF USER STILL EXISTS
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token no longer exist.', 401)
    );
  }

  // TODOCHECK IF USER CHANGE PASSWORD AFTER THE TOKEN WAS DELIVERED
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password!Please log in again.', 401)
    );
  }
  // TODO GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// =============================================================================
//                         @o UPDATE PASSWORD
// =============================================================================

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perfom this action', 403)
      );
    }
    next();
  };
};

// =============================================================================
//                         @o FORGOT PASSWORD
// =============================================================================

exports.forgotPassword = catchAsyncErr(async (req, res, next) => {
  //TODO GET USER BASED ON POSTED EMAIL
  const user = await User.findOne({ email: req.body.email });
  if (!user) next(new AppError('There is no user with that email adress', 404));
  //TODO GENERATE THE RANDOM RESET TOKEN
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //disable validation in schema
  //TODO SEND IT BACK BY EMAIL

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordRestExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

// =============================================================================
//                         @o RESET PASSWORD
// =============================================================================

exports.resetPassword = catchAsyncErr(async (req, res, next) => {
  // TODO GET USER BASED ON THE TOKEN
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  // TODO SET THE NEW PASSWORD IF TOKEN ISNT EXPIRED
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  // TODO UPDATE CHANGEPASSWORDAT
  // usermodel
  // TODO LOG USER IN , SEND JWT
  createSendToken(user, 200, res);
});

// =============================================================================
//                         @o UPDATE PASSWORD
// =============================================================================

exports.updatePassword = catchAsyncErr(async (req, res, next) => {
  // TODO GET USER FROM COLLECTION
  const user = await User.findById(req.user.id).select('+password');
  // TODO CHECK IF POSTED PASSWORD IS CORRECT
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return new AppError('Your current password is wrong.', 401);
  }
  // TODO THEN UPDATE PASSWORD
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // TODO LOG USER WITH NEW PASSWORD,SEND JWT
  createSendToken(user, 200, res);
});
