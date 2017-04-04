const Redis = jest.genMockFromModule('ioredis');
Redis.prototype.set = jest.fn(() => Promise.resolve());
export default Redis;
