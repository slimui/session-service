const Redis = jest.genMockFromModule('ioredis');
Redis.fakeAccessToken = 'fakeAccessToken';
Redis.prototype.hmset = jest.fn((key, value) => {
  if (value.accessToken === 'fail') {
    return Promise.reject('failed to set session');
  }
  return Promise.resolve();
});
Redis.prototype.hgetall = jest.fn((key) => {
  if (key === 'fail') {
    return Promise.reject('failed to get session');
  }
  return Promise.resolve({ accessToken: Redis.fakeAccessToken });
});
Redis.prototype.del = jest.fn((key) => {
  if (key === 'fail') {
    return Promise.reject('failed to delete session');
  }
  return Promise.resolve();
});
module.exports = Redis;
