const AppError = require('./../utils/appError');

// =============================================================================
//                         @m ERRORS HANDLERS
// =============================================================================

//@q handle for castError kind // happen with invalid Id params
const handleCastErrDB = err => {
  const message = `Invalid ${err.path}: ${err.errmsg}.`;

  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/"[^"]*"/); // everything between quotes
  const message = `Duplicate field values for ${value}.`;
  return new AppError(message, 400);
};

const handleValidationErrDB = err => {
  //@q Object.values(x) return an array && we map it and append the content to message
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('._')}`;
  return new AppError(message, 400);
};
const handleJWTErr = () =>
  new AppError('Invalid token . Please log in again!', 401);

const handleJWTExpiredErr = () =>
  new AppError('Expired Token, Please log in again!', 401);

// =============================================================================
//               @m Errors Responses related to ENV status
// =============================================================================

//@q handle err format in dev env
const sendErrDev = (err, req, res) => {
  //@q if API req we send the complete error as response
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  //@q if rendered website we sent a more friendly error && render it with our html template error
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    return res.status(500).json({
      status: 'error',
      message: "something went wrong :'("
    });
  }
  //@q if err 4XX err is operational so we render it specifically
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  //@q else we have a general error message 5XX
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

// =============================================================================
//      @m Exported module to handle errors in the app as globalErrorHandler
// =============================================================================

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTErr();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredErr();
    sendErrProd(error, req, res);
  }
};
