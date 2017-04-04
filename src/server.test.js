import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { v4, uniqueId } from 'uuid';
import { create } from './server';

describe('server', () => {
  const secret = 's3cr3t';
  beforeEach(() => {
    process.env.SIGNING_SECRET = secret;
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
      const token = jwt.sign({ sessionId: uniqueId }, secret);
      return create(call, cb)
        .then(() => {
          expect(cb)
            .toBeCalledWith(undefined, {
              token,
            });
        });
    });
  });
});
