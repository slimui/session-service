import micro from 'micro';
import listen from 'test-listen';
import request from 'request-promise';
import Redis from 'ioredis';
import RedisLock from 'ioredis-lock';
import jwt from 'jsonwebtoken';
import uuid from 'uuid/v4';
import {
  app as service,
  monthInSeconds,
  checkSessionVersion,
} from './';

// rewrite these with express server
describe('service', () => {
  const secret = 's3cr3t';
  let microService;

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    process.env.SESSION_VERSION = 'v1234';
    microService = micro(service);
  });

  afterEach(() => {
    microService.close();
  });

  describe('create', () => {
    it('should create a session', async () => {
      const url = await listen(microService);
      const session = {};
      const userId = 'userId';
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'create',
          args: JSON.stringify({
            session,
            userId,
          }),
        },
        json: true,
      });
      expect(jwt.sign)
        .toBeCalledWith({
          sessionId: `${process.env.SESSION_VERSION}_${userId}_${uuid()}`,
          sessionVersion: process.env.SESSION_VERSION,
        },
        process.env.JWT_SECRET,
        jasmine.any(Function));
      expect(uuid)
        .toBeCalled();
      expect(Redis.prototype.setex)
        .toBeCalledWith(`${process.env.SESSION_VERSION}_${userId}_${uuid.uniqueId}`, monthInSeconds, JSON.stringify(session));
    });

    it('should return a JWT token with the session jwt', async () => {
      const url = await listen(microService);
      const session = {};
      const userId = 'userId';
      const result = await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'create',
          args: JSON.stringify({
            session,
            userId,
          }),
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
      const userId = 'userId';
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'create',
            args: JSON.stringify({
              session,
              userId,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
          .toEqual('failed to sign');
      }
    });

    it('should handle a Redis set failure', async () => {
      const url = await listen(microService);
      const session = {
        accessToken: 'fail',
      };
      const userId = 'userId';
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'create',
            args: JSON.stringify({
              session,
              userId,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
        expect(err.error.error)
          .toBe('please specify a session object');
      }
    });

    it('should handle missing userId', async () => {
      const url = await listen(microService);
      const session = {};
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'create',
            args: JSON.stringify({
              session,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
          .toBe('please specify a userId');
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
          args: JSON.stringify({
            token: fakeJWT,
            sessionVersion: process.env.SESSION_VERSION,
          }),
        },
        json: true,
      });
      expect(jwt.verify)
        .toBeCalledWith(fakeJWT, secret, jasmine.any(Function));
    });

    it('should get item from redis', async () => {
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'get',
          args: JSON.stringify({
            token: fakeJWT,
            sessionVersion: process.env.SESSION_VERSION,
          }),
        },
        json: true,
      });
      expect(Redis.prototype.get)
        .toBeCalledWith(jwt.fakeSessionId);
      expect(Redis.prototype.expire)
        .toBeCalledWith(jwt.fakeSessionId, monthInSeconds);
    });

    it('should return an access jwt', async () => {
      const fakeJWT = 'fakeJWT';
      const url = await listen(microService);
      const result = await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'get',
          args: JSON.stringify({
            token: fakeJWT,
            keys: ['*'],
            sessionVersion: process.env.SESSION_VERSION,
          }),
        },
        json: true,
      });
      expect(result.result)
        .toEqual(Redis.fakeState);
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
            args: JSON.stringify({
              token: fakeJWT,
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
            args: JSON.stringify({
              token: fakeJWT,
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
            args: JSON.stringify({
              token: fakeJWT,
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
          .toBe('failed to get session');
      }
    });

    it('should handle missing session version', async () => {
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
        throw new Error('this should never happen');
      } catch (err) {
        expect(err.error.error)
          .toBe('please specify a sessionVersion');
      }
    });
    it('should handle mismatched sessionVersion', async () => {
      const fakeJWT = 'fakeJWT';
      const invalidSessionVersion = 'invalid';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'get',
            args: JSON.stringify({
              token: fakeJWT,
              sessionVersion: invalidSessionVersion,
            }),
          },
          json: true,
        });
        throw new Error('this should never happen');
      } catch (err) {
        expect(err.error.error)
          .toBe(`sessionVersion ${invalidSessionVersion} does not match ${process.env.SESSION_VERSION}`);
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
            sessionVersion: process.env.SESSION_VERSION,
          }),
        },
        json: true,
      });
      expect(jwt.verify)
        .toBeCalledWith(
          fakeJWT,
          secret,
          jasmine.any(Function),
        );
    });

    it('should update a session', async () => {
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        publish: {
          isHappening: 'yes',
        },
      };
      const result = await request({
        method: 'POST',
        uri: url,
        body: {
          name: 'update',
          args: JSON.stringify({
            token: fakeJWT,
            session,
            sessionVersion: process.env.SESSION_VERSION,
          }),
        },
        json: true,
      });
      expect(RedisLock.createLock)
        .toBeCalledWith(jasmine.any(Object), {
          timeout: 10000,
          retries: 3,
          delay: 100,
        });
      expect(result.result)
        .toBe('OK');
      expect(Redis.prototype.setex)
        .toBeCalledWith(
          jwt.fakeSessionId,
          monthInSeconds,
          JSON.stringify(Object.assign({}, Redis.fakeState, session)));
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
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
            args: JSON.stringify({
              token: fakeJWT,
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
            args: JSON.stringify({
              session,
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
          .toBe('please specify a token');
      }
    });

    it('should handle lock acquire failure', async () => {
      process.env.JWT_SECRET = 'lock_acquire_fail';
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        publish: {
          isHappening: 'yes',
        },
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
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
        throw Error('this should fail');
      } catch (err) {
        expect(err.error.error)
          .toBe('There was an error aquiring lock to update session');
      }
    });

    it('should handle lock release failure', async () => {
      process.env.JWT_SECRET = 'lock_release_fail';
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        publish: {
          isHappening: 'yes',
        },
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
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
        throw new Error('this should fail');
      } catch (err) {
        expect(err.error.error)
          .toBe('There was an error releasing lock to update session');
      }
    });

    it('should fail with missing session version', async () => {
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        publish: {
          isHappening: 'yes',
        },
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
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.error.error)
          .toBe('please specify a sessionVersion');
      }
    });
    it('should fail with invalid session version', async () => {
      const url = await listen(microService);
      const fakeJWT = 'fakeJWT';
      const session = {
        publish: {
          isHappening: 'yes',
        },
      };
      const invalidSessionVersion = 'invalid';
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'update',
            args: JSON.stringify({
              token: fakeJWT,
              session,
              sessionVersion: invalidSessionVersion,
            }),
          },
          json: true,
        });
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.error.error)
          .toBe(`sessionVersion ${invalidSessionVersion} does not match ${process.env.SESSION_VERSION}`);
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
          args: JSON.stringify({
            token,
            sessionVersion: process.env.SESSION_VERSION,
          }),
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
            args: JSON.stringify({
              sessionId,
              sessionVersion: process.env.SESSION_VERSION,
            }),
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
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
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
              sessionVersion: process.env.SESSION_VERSION,
            }),
          },
          json: true,
        });
      } catch (err) {
        expect(err.error.error)
          .toBe('there was an issue destroying the session');
      }
    });

    it('should handle missing session version', async () => {
      const token = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'destroy',
            args: JSON.stringify({ token }),
          },
          json: true,
        });
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.error.error)
          .toBe('please specify a sessionVersion');
      }
    });

    it('should handle invalid session version', async () => {
      const invalidSessionVersion = 'invalid';
      const token = 'fakeJWT';
      const url = await listen(microService);
      try {
        await request({
          method: 'POST',
          uri: url,
          body: {
            name: 'destroy',
            args: JSON.stringify({
              token,
              sessionVersion: invalidSessionVersion,
            }),
          },
          json: true,
        });
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.error.error)
          .toBe(`sessionVersion ${invalidSessionVersion} does not match ${process.env.SESSION_VERSION}`);
      }
    });
  });
  describe('checkSessionVersion', () => {
    it('should throw an error if sessions match', () => {
      const invalidSessionVersion = 'invalid';
      try {
        checkSessionVersion({
          sessionVersion: invalidSessionVersion,
        });
      } catch (err) {
        expect(err.message)
          .toBe(`sessionVersion ${invalidSessionVersion} does not match ${process.env.SESSION_VERSION}`);
      }
    });
    it('should throw an error if the session is missing', () => {
      try {
        checkSessionVersion({});
      } catch (err) {
        expect(err.message)
          .toBe('please specify a sessionVersion');
      }
    });
    it('should not throw an error with a valid session', () => {
      checkSessionVersion({
        sessionVersion: process.env.SESSION_VERSION,
      });
    });
  });
});
