const RedisLock = jest.genMockFromModule('ioredis-lock');
RedisLock.mockLock = {
  acquire: jest.fn(() => {
    if (process.env.JWT_SECRET === 'lock_acquire_fail') {
      return Promise.reject(new RedisLock.LockAcquisitionError());
    }
    return Promise.resolve();
  }),
  release: jest.fn(() => {
    if (process.env.JWT_SECRET === 'lock_release_fail') {
      return Promise.reject(new RedisLock.LockReleaseError());
    }
    return Promise.resolve();
  }),
};

RedisLock.createLock = jest.fn(() => RedisLock.mockLock);
module.exports = RedisLock;
