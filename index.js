const bugsnag = require('bugsnag');
const express = require('express');
const Redis = require('ioredis');
const { v4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { rpc, method, createError } = require('@bufferapp/micro-rpc');
const { apiError } = require('./middleware');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
app.set('isProduction', isProduction);

if (isProduction && process.env.BUGSNAG_KEY) {
  bugsnag.register(process.env.BUGSNAG_KEY);
  app.set('bugsnag', bugsnag);
}

const redis = new Redis(process.env.REDIS_URI);

const create = ({ session }) => {
  const sessionId = v4();
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  return redis.hmset(sessionId, session)
    .then(() => new Promise((resolve) => {
      jwt.sign({ sessionId }, process.env.JWT_SECRET, {}, (err, token) => {
        if (err) {
          throw createError({ message: err.message });
        } else {
          resolve({ token });
        }
      });
    }));
};

const get = ({ token }) => new Promise((resolve) => {
  jwt.verify(token, process.env.JWT_SECRET, {}, (err, payload) => {
    if (err) {
      throw createError({ message: err.message });
    } else {
      resolve(payload);
    }
  });
})
  .then(({ sessionId }) => redis.hgetall(sessionId))
  .then(session => new Promise((resolve, reject) => {
    jwt.sign(session, process.env.JWT_SECRET, {}, (err, sessionToken) => {
      if (err) {
        reject(err);
      } else {
        resolve({ token: sessionToken });
      }
    });
  }));


const update = ({ token, session }) => {
  if (!token) {
    throw createError({ message: 'please specify a token' });
  }
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  return new Promise((resolve) => {
    jwt.verify(token, process.env.JWT_SECRET, {}, (err, payload) => {
      if (err) {
        throw createError({ message: err.message });
      } else {
        resolve(payload);
      }
    });
  })
    .then(({ sessionId }) => redis.hmset(sessionId, session))
    .then(() => 'OK');
};

const destroy = ({ token }) => new Promise((resolve) => {
  jwt.verify(token, process.env.JWT_SECRET, {}, (err, payload) => {
    if (err) {
      throw createError({ message: err.message });
    } else {
      resolve(payload);
    }
  });
})
  .then(({ sessionId }) => redis.del(sessionId))
  .then(result =>
      (result === 0 ? Promise.reject(new Error('there was an issue destroying the session')) : undefined))
  .then(() => 'OK');

app.post('*', (req, res, next) => {
  rpc(
    method('create', create),
    method('get', get),
    method('update', update),
    method('destroy', destroy),
  )(req, res)
    .catch(err => next(err));
});


app.use(apiError);

app.listen(80, () => {
  console.log('listening on port 80');
});
