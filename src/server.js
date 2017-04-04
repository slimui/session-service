import Redis from 'ioredis';
import { v4 } from 'uuid';

const redis = new Redis(process.env.SESSION_STORE_LOCATION);

export const create = (call, cb) => // eslint-disable-line import/prefer-default-export
  redis.set(v4(), call.request.accessToken)
    .then(() => cb());
