/**
 * Central Express error handler — consistent JSON and status codes.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ message, ...(err.details && { details: err.details }) });
}

module.exports = { errorHandler };
