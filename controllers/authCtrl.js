const crypto = require('crypto'); //https://nodejs.org/docs/latest-v8.x/api/crypto.html
const { promisify } = require('util'); //https://nodejs.org/docs/latest-v8.x/api/util.html
const jwt = require('jsonwebtoken');
const User = require('./../models/usersModel');
const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// ======================================================================
//@a SIGN JWToken // https://github.com/auth0/node-jsonwebtoken
//@a jwt.sign(payload, secretOrPrivateKey, [options, callback])
// ======================================================================

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// ======================================================================
//@a CREATE JWToken WITH signToken
//@a SEND TOKEN IN A COOKIE && USER DATA TO THE CLIENT
// ======================================================================

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true // cookie not usable on the client
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  //@q res.cookie(name, value [, options])
  //@q https://expressjs.com/fr/api.html#res.cookie
  res.cookie('jwt', token, cookieOptions);

  //@q remove password from the output sent to client
  user.password = undefined;

  //@q send res with user data // statusCode 201 for signIn 200 for login
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  });
};

// =============================================================================
//                        @a SIGN UP
// =============================================================================

exports.signUp = catchAsyncErr(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });
  const url = `${req.protocol}://${req.get('host')}/me`; // protocol://natours.com/me

  //@q send our user data && a link to the user profile
  await new Email(newUser, url).sendWelcome();

  //@q create token and send cookie aswell as user data to the client
  createSendToken(newUser, 201, res);
});

// =============================================================================
//                         @a LOGIN
// =============================================================================

exports.logIn = catchAsyncErr(async (req, res, next) => {
  //@q deconstruct email and password from the req.body
  const { email, password } = req.body;

  //@q check email | password existence
  if (!email || !password) {
    //@m throw an custom error for bad request if not
    return next(new AppError('Please provide email and password!', 400));
  }

  //@q query user with email , ask for password and persist data in a variable
  const user = await User.findOne({ email: email }).select('+password');

  //@q check if query succeed && password correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    //@m if not throw custom error 401 for unauthorized
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

// =============================================================================
//                         @a LOG OUT
// =============================================================================

exports.logOut = (req, res) => {
  //@q send an 'empty' token && and an expires time of 10 sc
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// =============================================================================
//                         @a LOGGED IN
// =============================================================================

exports.isLoggedIn = async (req, res, next) => {
  //@q if jwt cookies exist
  if (req.cookies.jwt) {
    //@q we use promisify on jwt.verify to be able to call it asynchronously
    //@q jwt.verify(token, secretOrPublicKey, [options, callback])
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //@d query to DB with the id collected from the decoded token in our cookie
      const currentUser = await User.findById(decoded.id);

      //@q if !user we call next() and go to the next middleware
      if (!currentUser) {
        return next();
      }

      //@q if user changed password after his signed Token iat next()
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //@a if we reach this point everything is ok and the user is logged in

      //@q we persist our currentUser data in res.locals.user to be able to access it on our views
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// =============================================================================
//                         @a PROTECT
// =============================================================================

exports.protect = catchAsyncErr(async (req, res, next) => {
  //@q we initiate our token var outside of our if else to be able to reassign it easly without any pb of scope
  let token;

  //@q check if authorization exist in our header && if we have a Bearer in it
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    //@q if we have Bearer we split the string and pick the token who is the second element of our returned array && persist it in our variable
    token = req.headers.authorization.split(' ')[1];

    //@q if we have a token in a cookie we just persist it in our token variable
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log('=====================================');
  console.log(decoded);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token no longer exist.', 401)
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password!Please log in again.', 401)
    );
  }
  //@a if we reach this point everything is ok

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// =============================================================================
//                         @a RESTRICT TO
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
//                         @a FORGOT PASSWORD
// =============================================================================

exports.forgotPassword = catchAsyncErr(async (req, res, next) => {
  //@d get user  with email from database and persist it
  const user = await User.findOne({ email: req.body.email });

  if (!user) next(new AppError('There is no user with that email adress', 404));

  //@q generate random token with our User model method
  const resetToken = user.createPasswordResetToken();

  //@q we use user.save to trigger our pre middleware in our user model
  await user.save({ validateBeforeSave: false }); //disable validation in schema

  //@q try catch block to send it by email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });

    //@m if error we clean our user document from passwordResetToken && passwordResetExpires
    //@m & use save again to trigger our pre middleware and persist our changes
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
//                         @a RESET PASSWORD
// =============================================================================

exports.resetPassword = catchAsyncErr(async (req, res, next) => {
  //@q pick token from params sent to user by email
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  //@d query user with the hashed token && check token expires time
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  //@q persist new data && clean resetToken
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

// =============================================================================
//                         @a UPDATE PASSWORD
// =============================================================================

exports.updatePassword = catchAsyncErr(async (req, res, next) => {
  //@d  query user with user id
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return new AppError('Your current password is wrong.', 401);
  }

  //@q persist new data
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});
