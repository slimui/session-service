import micro from 'micro';
import listen from 'test-listen';
import request from 'request-promise';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { v4, uniqueId } from 'uuid';
import service from './';

describe('service', () => {
  const secret = 's3cr3t';
  let microService;

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    microService = micro(service);
  });

  afterEach(() => {
    microService.close();
  });

  describe('create', () => {
    it('should create a session', async () => {
      const url = await listen(microService);
      const session = {};
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'create',
          args: JSON.stringify({ session }),
        },
        json: true,
      });
      expect(v4)
        .toBeCalled();
      expect(Redis.prototype.hmset)
        .toBeCalledWith(uniqueId, session);
    });

    it('should return a JWT token with the session jwt', async () => {
      const url = await listen(microService);
      const session = {};
      const result = await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'create',
          args: JSON.stringify({ session }),
        },
        json: true,
      });

      expect(result.result)
        .toEqual({ token: jwt.fakeToken });
    });

    it('should handle JWT sign failure', async () => {
      process.env.JWT_SECRET = 'fail';
      const url = await listen(microService);
      const session = {};
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'create',
            args: JSON.stringify({ session }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to sign');
      }
    });

    it('should handle a Redis set failure', async () => {
      const url = await listen(microService);
      const session = {
        accessToken: 'fail',
      };
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'create',
            args: JSON.stringify({ session }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to set session');
      }
    });

    it('should handle missing session', async () => {
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'create',
            args: JSON.stringify({ }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('please specify a session object');
      }
    });
  });

  describe('get', () => {
    it('should verify token', async () => {
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'get',
          args: JSON.stringify({ token: fakeJWT }),
        },
        json: true,
      });
      expect(jwt.verify)
        .toBeCalledWith(fakeJWT, secret, {}, jasmine.any(Function));
    });

    it('should get item from redis', async () => {
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'get',
          args: JSON.stringify({ token: fakeJWT }),
        },
        json: true,
      });
      expect(Redis.prototype.hgetall)
        .toBeCalledWith(jwt.fakeSessionId);
    });

    it('should return an access jwt', async () => {
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      const result = await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'get',
          args: JSON.stringify({ token: fakeJWT }),
        },
        json: true,
      });
      expect(result.result)
        .toEqual({ token: jwt.fakeToken });
      expect(jwt.sign)
        .toBeCalledWith(
          { accessToken: Redis.fakeAccessToken },
          secret,
          {},
          jasmine.any(Function),
        );
    });

    it('should handle jwt verify failures', async () => {
      process.env.JWT_SECRET = 'fail';
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'get',
            args: JSON.stringify({ token: fakeJWT }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to verify');
      }
    });

    it('should handle jwt sign failures', async () => {
      process.env.JWT_SECRET = 'anotherfail';
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'get',
            args: JSON.stringify({ token: fakeJWT }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to sign');
      }
    });

    it('should handle redis get failures', async () => {
      process.env.JWT_SECRET = 'redisfail';
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'get',
            args: JSON.stringify({ token: fakeJWT }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to get session');
      }
    });
  });

  describe('update', () => {
    it('should verify jwt token', async () => {
      const fakeJWT = 'fakeJWT';
      const session = {
        isHappening: 'yes',
      };
      const url = await listen(microService);
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'update',
          args: JSON.stringify({
            token: fakeJWT,
            session,
          }),
        },
        json: true,
      });
      expect(jwt.verify)
        .toBeCalledWith(fakeJWT, secret, {}, jasmine.any(Function));
    });

    it('should update a session', async () => {
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        isHappening: 'yes',
      };
      const result = await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'update',
          args: JSON.stringify({
            token: fakeJWT,
            session,
          }),
        },
        json: true,
      });
      expect(result.result)
        .toBe('OK');
      expect(Redis.prototype.hmset)
        .toBeCalledWith(jwt.fakeSessionId, session);
    });

    it('should handle jwt verify failures', async () => {
      process.env.JWT_SECRET = 'fail';
      const fakeJWT = 'fakeJWT';
      const session = {
        isHappening: 'yes',
      };
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'update',
            args: JSON.stringify({
              token: fakeJWT,
              session,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to verify');
      }
    });

    it('should handle a Redis set failure', async () => {
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        accessToken: 'fail',
      };
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'update',
            args: JSON.stringify({
              token: fakeJWT,
              session,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to set session');
      }
    });

    it('should handle missing session', async () => {
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'update',
            args: JSON.stringify({ token: fakeJWT }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('please specify a session object');
      }
    });

    it('should handle missing token', async () => {
      const url = await listen(microService);
      const session = {
        accessToken: 'fail',
      };
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'update',
            args: JSON.stringify({ session }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('please specify a token');
      }
    });
  });

  describe('destroy', () => {
    it('should delete session from redis by key', async () => {
      const token = 'fakeJWT';
      const url = await listen(microService);
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'destroy',
          args: JSON.stringify({ token }),
        },
        json: true,
      });
      expect(Redis.prototype.del)
        .toBeCalledWith(jwt.fakeSessionId);
    });

    it('should handle redis delete failure', async () => {
      const sessionId = 'fail';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'destroy',
            args: JSON.stringify({ sessionId }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to delete session');
      }
    });

    it('should handle jwt verify failures', async () => {
      process.env.JWT_SECRET = 'fail';
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'destroy',
            args: JSON.stringify({
              token: fakeJWT,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('failed to verify');
      }
    });

    it('should handle redis fail', async () => {
      process.env.JWT_SECRET = 'failWithZero';
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'destroy',
            args: JSON.stringify({
              token: fakeJWT,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error)
          .toBe('there was an issue destroying the session');
      }
    });
  });
});
