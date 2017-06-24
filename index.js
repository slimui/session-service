const Redis = require('ioredis');
const { v4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { rpc, method, createError } = require('@bufferapp/micro-rpc');

const redis = new Redis('session-redis');

const create = ({ session }) => {
  const sessionId = v4();
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'Please specify a sesssion object' });
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
    }));
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
  }));

const destroy = ({ sessionId }) => redis.del(sessionId);


module.exports = rpc(
  method('create', create),
  method('get', get),
  // method('update', update), // TODO: replace session object
  method('destroy', destroy));
