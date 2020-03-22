const mongoose = require('mongoose');
const dotenv = require('dotenv');

// ============================================================================================
// @bug UNCAUGHT EXCEPTIONS https://nodejs.org/api/process.html#process_event_uncaughtexception
// ============================================================================================

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION!💥  Shutting down...\n', err);
  process.exit(1);
});

// =============================================================================
//@o https://www.npmjs.com/package/dotenv
// =============================================================================

dotenv.config({ path: './config.env' });

// =============================================================================
//@d DB CONNECTION https://mongoosejs.com/docs/connections.html
// =============================================================================
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful! 🌈 🐒 '));

// ======================================================================
//@a SERVER CONNECTION https://expressjs.com/en/starter/hello-world.html
// ======================================================================

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// ==============================================================================================
// @bug UNHANDLED REJECTIONS https://nodejs.org/api/process.html#process_event_unhandledrejection
// ==============================================================================================

//NOTE Map() https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Map

const unhandledRejections = new Map();

process.on('unhandledRejection', (reason, promise) => {
  unhandledRejections.set(promise, reason);
  console.error(
    'UNHANDLE REJECTION!💥  Shutting down...\n',
    unhandledRejections
  );
  server.close(() => {
    process.exit(1);
  });
});
