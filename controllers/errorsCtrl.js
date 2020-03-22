const AppError = require('./../utils/appError');

// =============================================================================
//                         @o Errors HANDLERS
// =============================================================================

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
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('._')}`;
  return new AppError(message, 400);
};
const handleJWTErr = () =>
  new AppError('Invalid token . Please log in again!', 401);

const handleJWTExpiredErr = () =>
  new AppError('Expired Token, Please log in again!', 401);
// =============================================================================
//               @o Errors Responses related to ENV status
// =============================================================================

const sendErrDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  // RENDERED WEBSITE
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};
const sendErrProd = (err, req, res) => {
  // API
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
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

// =============================================================================
//      @o Exported module to handle errors in the app as globalErrorHandler
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
