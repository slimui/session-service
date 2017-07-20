const micro = require('micro');
const Redis = require('ioredis');
const { v4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { rpc, method, createError } = require('@bufferapp/micro-rpc');

const redis = new Redis(process.env.REDIS_URI);

const create = ({ session }) => {
  const sessionId = v4();
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  return redis.hmset(sessionId, session)
    .then(() => new Promise((resolve, reject) => {
      jwt.sign({ sessionId }, process.env.JWT_SECRET, {}, (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve({ token });
        }
      });
    }))
    .catch((err) => {
      throw createError({ message: err.message });
    });
};

const get = ({ token }) => new Promise((resolve, reject) => {
  jwt.verify(token, process.env.JWT_SECRET, {}, (err, payload) => {
    if (err) {
      reject(err);
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
  }))
  .catch((err) => {
    throw createError({ message: err.message });
  });


const update = ({ token, session }) => {
  if (!token) {
    throw createError({ message: 'please specify a token' });
  }
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, {}, (err, payload) => {
      if (err) {
        reject(err);
      } else {
        resolve(payload);
      }
    });
  })
    .then(({ sessionId }) => redis.hmset(sessionId, session))
    .then(() => 'OK')
    .catch((err) => {
      throw createError({ message: err.message });
    });
};

const destroy = ({ token }) => new Promise((resolve, reject) => {
  jwt.verify(token, process.env.JWT_SECRET, {}, (err, payload) => {
    if (err) {
      reject(err);
    } else {
      resolve(payload);
    }
  });
})
  .then(({ sessionId }) => redis.del(sessionId))
  .then(result =>
      (result === 0 ? Promise.reject(new Error('there was an issue destroying the session')) : undefined))
  .then(() => 'OK')
  .catch((err) => {
    throw createError({ message: err.message });
  });


const service = rpc(
  method('create', create),
  method('get', get),
  method('update', update),
  method('destroy', destroy),
);

const server = micro(service);

server.listen(80);
