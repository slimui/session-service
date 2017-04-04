const Redis = jest.genMockFromModule('ioredis');
Redis.prototype.set = jest.fn((key, value) => {
  if (value === 'fail') {
    return Promise.reject('failed to set session');
  }
  return Promise.resolve();
});
export default Redis;
