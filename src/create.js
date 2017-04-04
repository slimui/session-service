import Redis from 'ioredis';
import { v4 } from 'uuid';

const create = (call, cb) =>
  Redis.set(v4(), call.request.accessToken)
    .then(() => cb());

export default create;
