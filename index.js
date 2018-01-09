const util = require('util');
const bugsnag = require('bugsnag');
const express = require('express');
const Redis = require('ioredis');
const uuid = require('uuid/v4');
const jwt = require('jsonwebtoken');
const { rpc, method, createError } = require('@bufferapp/micro-rpc');
const logMiddleware = require('@bufferapp/logger/middleware');
const connectDatadog = require('@bufferapp/connect-datadog');
const { StatsD } = require('node-dogstatsd');
const redisLock = require('ioredis-lock');
const { apiError } = require('./middleware');
const { mergeSessions, filteredSession } = require('./utils');

module.exports = {};


const app = express();

const isProduction = process.env.NODE_ENV === 'production';
app.set('isProduction', isProduction);

if (isProduction && process.env.BUGSNAG_KEY) {
  bugsnag.register(process.env.BUGSNAG_KEY);
  app.set('bugsnag', bugsnag);
}

if (isProduction) {
  const dogstatsd = new StatsD('dd-agent.default');
  app.use(connectDatadog({
    dogstatsd,
    response_code: true,
    bufferRPC: true,
    tags: ['app:session-service', `track:${process.env.RELEASE_TRACK || 'dev'}`],
  }));
}

const redis = new Redis(process.env.REDIS_URI);

const jwtSign = util.promisify(jwt.sign);
const jwtVerify = util.promisify(jwt.verify);

module.exports.monthInSeconds = 60 * 24 * 31;

const tokenizer = '_';

const create = ({ session, userId }) => {
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  if (!userId) {
    throw createError({ message: 'please specify a userId' });
  }
  const sessionId = `${userId}${tokenizer}${uuid()}`;
  // create a session that expires automatically in a month
  return redis.setex(sessionId, module.exports.monthInSeconds, JSON.stringify(session))
    .then(() => jwtSign({ sessionId }, process.env.JWT_SECRET))
    .then(sessionToken => ({ token: sessionToken }));
};

const get = async ({ token, keys = [] }) => {
  const { sessionId } = await jwtVerify(token, process.env.JWT_SECRET);
  let rawSesion;
  if (sessionId) {
    rawSesion = await redis.get(sessionId);
  }
  if (rawSesion) {
    // push the expiration back a month on get
    await redis.expire(sessionId, module.exports.monthInSeconds);
    const parsedSession = JSON.parse(rawSesion);
    return filteredSession({
      keys,
      session: parsedSession,
    });
  }
  return null;
};


const safeRelease = async (lock) => {
  try {
    await lock.release();
  } catch (err) {
    throw createError({ message: 'There was an error releasing lock to update session' });
  }
};

const update = async ({ token, session }) => {
  if (!token) {
    throw createError({ message: 'please specify a token' });
  }
  if (!session || !(session instanceof Object)) {
    throw createError({ message: 'please specify a session object' });
  }
  const lock = redisLock.createLock(redis, {
    timeout: 10000,
    retries: 3,
    delay: 100,
  });
  try {
    const { sessionId } = await jwtVerify(token, process.env.JWT_SECRET);
    await lock.acquire(`${sessionId}:lock`);
    // get the existing session
    const oldSesion = JSON.parse(await redis.get(sessionId));
    // merge the existing session with the new session
    await redis.setex(sessionId, module.exports.monthInSeconds, JSON.stringify(mergeSessions({
      oldSesion,
      newSession: session,
    })));
  } catch (err) {
    if (err instanceof redisLock.LockAcquisitionError) {
      throw createError({ message: 'There was an error aquiring lock to update session' });
    } else {
      throw err;
    }
  } finally {
    await safeRelease(lock);
  }
  return 'OK';
};

const destroy = ({ token }) =>
  jwtVerify(token, process.env.JWT_SECRET)
    .then(({ sessionId }) => redis.del(sessionId))
    .then(result =>
      (result === 0 ? Promise.reject(new Error('there was an issue destroying the session')) : undefined))
    .then(() => 'OK');

if (process.env.NODE_ENV !== 'test') {
  app.use(logMiddleware({ name: 'SessionService' }));
}

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

module.exports.app = app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(80, () => {
    console.log('listening on port 80');
  });
}
