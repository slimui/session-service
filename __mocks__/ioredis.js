const Redis = jest.genMockFromModule('ioredis');
Redis.fakeAccessToken = 'fakeAccessToken';
Redis.prototype.set = jest.fn((key, value) => {
  if (value === 'fail') {
    return Promise.reject('failed to set session');
  }
  return Promise.resolve();
});
Redis.prototype.get = jest.fn(() => Promise.resolve(Redis.fakeAccessToken));
export default Redis;
