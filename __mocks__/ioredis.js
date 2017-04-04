const Redis = jest.genMockFromModule('ioredis');
Redis.fakeAccessToken = 'fakeAccessToken';
Redis.prototype.set = jest.fn((key, value) => {
  if (value === 'fail') {
    return Promise.reject('failed to set session');
  }
  return Promise.resolve();
});
Redis.prototype.get = jest.fn((key) => {
  if (key === 'fail') {
    return Promise.reject('failed to get session');
  }
  return Promise.resolve(Redis.fakeAccessToken);
});
Redis.prototype.del = jest.fn(() => Promise.resolve());
export default Redis;
