// CAN BE USED TO AVOID THE UGLY TRY CATCH IN OUR ASYNC FUNCTIONS

module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err));
  };
};
