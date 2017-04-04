import { v4, uniqueId } from 'uuid';
import Redis from 'ioredis';
import { create } from './server';

describe('server', () => {
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
  });
});
