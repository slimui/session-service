const util = require('util');
const bugsnag = require('bugsnag');
const express = require('express');
const Redis = require('ioredis');
const uuid = require('uuid/v4');
const jwt = require('jsonwebtoken');
const { rpc, method, createError } = require('@bufferapp/micro-rpc');
const logMiddleware = require('@bufferapp/logger/middleware');
const { apiError } = require('./middleware');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
app.set('isProduction', isProduction);

if (isProduction && process.env.BUGSNAG_KEY) {
  bugsnag.register(process.env.BUGSNAG_KEY);
  app.set('bugsnag', bugsnag);
}

const redis = new Redis(process.env.REDIS_URI);

const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);

const create = ({ session }) => {
  const sessionId = uuid();
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  return redis.hmset(sessionId, session)
    .then(() => jwtSign({ sessionId }, process.env.JWT_SECRET));
};

const get = ({ token }) => jwtVerify(token, process.env.JWT_SECRET)
  .then(({ sessionId }) => redis.hgetall(sessionId))
  .then(session => jwtSign(session, process.env.JWT_SECRET));


const update = ({ token, session }) => {
  if (!token) {
    throw createError({ message: 'please specify a token' });
  }
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  return jwtVerify(token, process.env.JWT_SECRET)
    .then(({ sessionId }) => redis.hmset(sessionId, session))
    .then(() => 'OK');
};

const destroy = ({ token }) => jwtVerify(token, process.env.JWT_SECRET)
  .then(({ sessionId }) => redis.del(sessionId))
  .then(result =>
      (result === 0 ? Promise.reject(new Error('there was an issue destroying the session')) : undefined))
  .then(() => 'OK');

app.use(logMiddleware({ name: 'SessionService' }));

app.post('*', (req, res, next) => {
  rpc(
    method('create', create),
    method('get', get),
    method('update', update),
    method('destroy', destroy),
  )(req, res)
    .catch(err => next(err));
});

app.get('/health-check', (req, res) => {
  redis.ping()
    .then(() => res.status(200).json({ status: 'awesome' }))
    .catch(() => res.status(500).json({ status: 'cannot reach redis' }));
});

app.use(apiError);

app.listen(80, () => {
  console.log('listening on port 80');
});
