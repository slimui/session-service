const Redis = jest.genMockFromModule('ioredis');
Redis.fakeState = {
  global: {
    userId: '123',
  },
};
Redis.prototype.setex = jest.fn((key, ex, value) => {
  if (value.accessToken === 'fail') {
    return Promise.reject(new Error('failed to set session'));
  }
  return Promise.resolve();
});
Redis.prototype.get = jest.fn((key) => {
  if (key === 'fail') {
    return Promise.reject(new Error('failed to get session'));
  }
  return Promise.resolve(JSON.stringify(Redis.fakeState));
});
Redis.prototype.del = jest.fn((key) => {
  if (key === 'fail') {
    return Promise.reject(new Error('failed to delete session'));
  } else if (key === 'failWithZero') {
    return Promise.resolve(0);
  }
  return Promise.resolve();
});
module.exports = Redis;
