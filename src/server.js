import grpc from 'grpc';
import Redis from 'ioredis';
import { v4 } from 'uuid';
import jwt from 'jsonwebtoken';

const proto = grpc.load('./session.proto');
const redis = new Redis(process.env.SESSION_STORE_LOCATION);

export const create = (call, cb) => {
  const sessionId = v4();
  return new Promise((resolve, reject) => {
    const accessToken = call.request.accessToken;
    if (!accessToken) {
      reject('Missing accessToken in session data');
    } else {
      resolve(accessToken);
    }
  })
    .then(accessToken => redis.set(sessionId, { accessToken }))
    .then(() => new Promise((resolve, reject) => {
      jwt.sign({ sessionId }, process.env.SIGNING_SECRET, {}, (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      });
    }))
    .then(token => cb(undefined, { token }))
    .catch(err => cb(err));
};

export const get = (call, cb) =>
  new Promise((resolve, reject) => {
    jwt.verify(call.request.jwt, process.env.SIGNING_SECRET, {}, (err, payload) => {
      if (err) {
        reject(err);
      } else {
        resolve(payload);
      }
    });
  })
    .then(({ sessionId }) => redis.get(sessionId))
    .then(({ accessToken }) => new Promise((resolve, reject) => {
      jwt.sign({ accessToken }, process.env.SIGNING_SECRET, {}, (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      });
    }))
    .then(token => cb(undefined, { token }))
    .catch(err => cb(err));

export const destroy = (call, cb) =>
  redis.del(call.request.sessionId)
    .then(() => cb())
    .catch(err => cb(err));

const server = new grpc.Server();
server.addProtoService(proto.sessions.Sessions.service, {
  create,
  get,
  destroy,
});
server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
server.start();
