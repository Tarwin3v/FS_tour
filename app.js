const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError'); // custom class error
const gobalErrorHandler = require('./controllers/errorsCtrl'); // handle DB errors

const toursRouter = require('./routes/toursRoutes');
const usersRouter = require('./routes/usersRoutes');
const reviewsRouter = require('./routes/reviewsRoutes');
const bookingsRouter = require('./routes/bookingsRoutes');
const viewsRouter = require('./routes/viewsRoutes');

// ======================================================================
//@a INITIATE OUR EXPRESS INSTANCE // https://expressjs.com/fr/starter/installing.html
// ======================================================================

const app = express();

// ======================================================================
//@a HTML ENGINE SETTING // https://devhints.io/pug
// ======================================================================

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

console.log('========================');
console.log(`NODE_ENV||${process.env.NODE_ENV}🖥️`);
console.log('========================');

// ======================================================================
//@a SERVE STATIC ASSETS // https://expressjs.com/fr/starter/static-files.html
// ======================================================================

app.use(express.static(path.join(__dirname, 'public')));

// ======================================================================
//@a SET SECURE HTTP HEADERS // https://www.npmjs.com/package/helmet
// ======================================================================
app.use(helmet());
// detailed req logs during development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ======================================================================
//@a RATE LIMITER //https://www.npmjs.com/package/express-rate-limit
// ======================================================================
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in one hour'
});
app.use('/api', limiter);

// ======================================================================
//@a BODY PARSER // https://stackoverflow.com/questions/47232187/express-json-vs-bodyparser-json/47232318
// ======================================================================

app.use(express.json({ limit: '10kb' }));

// ======================================================================
//@a COOKIE PARSER // https://github.com/expressjs/cookie-parser
// ======================================================================

app.use(cookieParser());

// ======================================================================
//@a NoSQL DATA SANATIZATION // https://www.npmjs.com/package/express-mongo-sanitize // REMOVE($)
// ======================================================================

app.use(mongoSanitize());

// ======================================================================
//@a DATA SANATIZATION AGAINST XSS  // https://www.npmjs.com/package/xss-clean // CLEAN ANY USER INPUT FROM HTML MALICIOUS CODE
// ======================================================================

app.use(xss());

// ======================================================================
//@a PARAMETERS POLLUTION // https://www.npmjs.com/package/hpp
// ======================================================================

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log('=====================================');
  console.log('==============req.headers============');
  console.log(req.headers);
  console.log('=====================================');
  next();
});

// =============================================================================
// @o ROUTES https://expressjs.com/fr/guide/routing.html
// =============================================================================
app.use('/', viewsRouter);
app.use('/api/v1/tours', toursRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/bookings', bookingsRouter);

// =============================================================================
// @m ERRORS handlers
// =============================================================================

// @m handle every req with a false route
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// @m This part handle DB req errors
app.use(gobalErrorHandler);

module.exports = app;
