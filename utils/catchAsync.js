/* Returns a function. */
module.exports = fn => (req, res, next) => {
  /* .catch(next) equals to .catch(err => next(err)) */
  fn(req, res, next).catch(next);
};
