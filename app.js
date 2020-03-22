const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const gobalErrorHandler = require('./controllers/errorsCtrl');
const toursRouter = require('./routes/toursRoutes');
const usersRouter = require('./routes/usersRoutes');
const reviewsRouter = require('./routes/reviewsRoutes');
const bookingsRouter = require('./routes/bookingsRoutes');

const viewsRouter = require('./routes/viewsRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// =============================================================================
// @MIDDLEWARES
// =============================================================================
console.log('========================');
console.log(`NODE_ENV||${process.env.NODE_ENV}🖥️`);
console.log('========================');

// serving static files

app.use(express.static(path.join(__dirname, 'public')));

// security http headers

app.use(helmet());

// development logging

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit request from some API

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in one hour'
});
app.use('/api', limiter);

// body parser, reading data from body into req.body

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

//  data sanatization against NoSQL query injection(remove $)

app.use(mongoSanitize());

// data sanatization against XSS (cross site scripting attack)(clean any user input from html malicious code)

app.use(xss());

// prevent parameters pollution

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
// @m ROUTES https://expressjs.com/fr/guide/routing.html
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
