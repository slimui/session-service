module.exports = {};

module.exports.mergeSessions = ({ oldSesion, newSession }) =>
  Object.assign({}, oldSesion, newSession);
