const { json } = require('micro');

module.exports.apiError = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.httpCode) {
    const filteredError = Object.assign({}, err);
    const httpCode = err.httpCode;
    delete filteredError.httpCode;
    res.status(httpCode).send(filteredError);
  } else if (req.app.get('isProduction') && req.app.get('bugsnag')) {
    // parse the body for json
    json(req)
      // if it fails the body wasn't json and no params where passed in
      .catch(() => ({}))
      // notify bugsnag with params
      .then(params =>
        req.app.get('bugsnag').notify(err, {
          originalUrl: req.originalUrl,
          params,
        }));
    res.status(500).send({
      error: 'Whoops something went wrong! We\'ve been alerted and will be sure to take a look',
    });
  } else {
    res.status(500).send({
      error: err.message,
      stack: err.stack,
    });
  }
};
