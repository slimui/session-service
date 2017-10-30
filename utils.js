module.exports = {};

module.exports.mergeSessions = ({ oldSesion, newSession }) =>
  Object.assign({}, oldSesion, newSession);

module.exports.filteredSession = ({
  keys,
  session,
}) => {
  if (keys.find(key => key === '*')) {
    return session;
  }
  return keys.reduce((previousSession, key) => {
    if (key in session) {
      return Object.assign(
        {},
        previousSession,
        { [key]: session[key] },
      );
    }
    return previousSession;
  }, {});
};
