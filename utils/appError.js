// =============================================================================
// @m CUSTOM ERROR CLASS //  https://gist.github.com/slavafomin/b164e3e710a6fc9352c934b9073e7216
// @m //https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Error
// =============================================================================

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    //IF CLIENT ERROR SEND FAIL OTHERWISE SEND ERROR
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    // https://v8.dev/docs/stack-trace-api
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
