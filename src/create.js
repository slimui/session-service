import Redis from 'ioredis';
import { v4 } from 'uuid';

const redis = new Redis();

const create = (call, cb) =>
  redis.set(v4(), call.request.accessToken)
    .then(() => cb());

export default create;
