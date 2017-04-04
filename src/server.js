import grpc from 'grpc';
import Redis from 'ioredis';
import { v4 } from 'uuid';
import jwt from 'jsonwebtoken';

const proto = grpc.load('./session.proto');
const redis = new Redis(process.env.SESSION_STORE_LOCATION);

export const create = (call, cb) => { // eslint-disable-line import/prefer-default-export
  const sessionId = v4();
  return new Promise((resolve, reject) => {
    const accessToken = call.request.accessToken;
    if (!accessToken) {
      reject('Missing accessToken in session data');
    } else {
      resolve(accessToken);
    }
  })
    .then(accessToken => redis.set(sessionId, accessToken))
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
  Promise.resolve()
    .then(() => cb());

const server = new grpc.Server();
server.addProtoService(proto.sessions.Sessions.service, { create });
server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
server.start();
