import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { v4, uniqueId } from 'uuid';
import grpc from 'grpc';
import {
  create,
  get,
  destroy,
} from './server';

describe('server', () => {
  const secret = 's3cr3t';
  beforeEach(() => {
    process.env.SIGNING_SECRET = secret;
  });
  it('should start grpc server', () => {
    expect(grpc.Server.prototype.start)
      .toBeCalled();
  });

  it('should hook up all rpcs to service', () => {
    expect(grpc.Server.prototype.addProtoService)
      .toBeCalledWith(grpc.stubService, { create });
  });

  it('should bind grpc server', () => {
    expect(grpc.Server.prototype.bind)
      .toBeCalled();
  });

  describe('create', () => {
    it('should call callback on success', () => {
      const accessToken = 'accessToken';
      const cb = jest.fn();
      const call = {
        request: { accessToken },
      };
      return create(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalled();
        });
    });

    it('should set item in redis', () => {
      const accessToken = 'accessToken';
      const call = {
        request: { accessToken },
      };
      create(call, () => {});
      expect(v4)
        .toBeCalled();
      expect(Redis.prototype.set)
        .toBeCalledWith(uniqueId, accessToken);
    });

    it('should return a JWT token with the session jwt', () => {
      const accessToken = 'accessToken';
      const cb = jest.fn();
      const call = {
        request: { accessToken },
      };
      return create(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith(undefined, {
              token: jwt.fakeToken,
            });
        });
    });

    it('should handle JWT sign failure', () => {
      const accessToken = 'accessToken';
      const call = {
        request: { accessToken },
      };
      process.env.SIGNING_SECRET = 'fail';
      const cb = jest.fn();
      return create(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith('failed to sign');
        });
    });

    it('should handle a Redis set failure', () => {
      const accessToken = 'fail';
      const call = {
        request: { accessToken },
      };
      const cb = jest.fn();
      return create(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith('failed to set session');
        });
    });

    it('should handle missing accessToken', () => {
      const call = {
        request: { },
      };
      const cb = jest.fn();
      return create(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith('Missing accessToken in session data');
        });
    });
  });

  describe('get', () => {
    it('should call callback on success', () => {
      const fakeJWT = 'fake JWT';
      const cb = jest.fn();
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      return get(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalled();
        });
    });

    it('should verify token', () => {
      const fakeJWT = 'fakeJWT';
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      return get(call, () => {})
        .then(() => {
          expect(jwt.verify)
            .toBeCalledWith(fakeJWT, secret, {}, jasmine.any(Function));
        });
    });

    it('should get item from redis', () => {
      const fakeJWT = 'fakeJWT';
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      return get(call, () => {})
        .then(() => {
          expect(Redis.prototype.get)
            .toBeCalledWith(jwt.fakeSessionId);
        });
    });

    it('should return an access jwt', () => {
      const fakeJWT = 'fakeJWT';
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      const cb = jest.fn();
      return get(call, cb)
        .then(() => {
          expect(jwt.sign)
            .toBeCalledWith(
              { accessToken: Redis.fakeAccessToken },
              secret,
              {},
              jasmine.any(Function),
            );
          expect(cb)
            .toBeCalledWith(undefined, { token: jwt.fakeToken });
        });
    });

    it('should handle jwt verify failures', () => {
      const fakeJWT = 'fakeJWT';
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      process.env.SIGNING_SECRET = 'fail';
      const cb = jest.fn();
      return get(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith('failed to verify');
        });
    });

    it('should handle jwt sign failures', () => {
      const fakeJWT = 'fakeJWT';
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      process.env.SIGNING_SECRET = 'anotherfail';
      const cb = jest.fn();
      return get(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith('failed to sign');
        });
    });

    it('should handle redis get failures', () => {
      const fakeJWT = 'fakeJWT';
      const call = {
        request: {
          jwt: fakeJWT,
        },
      };
      process.env.SIGNING_SECRET = 'redisfail';
      const cb = jest.fn();
      return get(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith('failed to get session');
        });
    });
  });

  describe('destroy', () => {
    it('description', () => {
      const sessionId = 'sessionId';
      const cb = jest.fn();
      const call = {
        request: {
          sessionId,
        },
      };
      return destroy(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalled();
        });
    });
  });
});
