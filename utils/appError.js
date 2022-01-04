class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    /* To ensure to send only operational errors to users. */
    this.isOperational = true;

    /* Constructor function call will not appear in error stacktrace. 
       Thus, not polluting it. */
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
