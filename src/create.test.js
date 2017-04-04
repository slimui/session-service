import uuid from 'uuid';
import Redis from 'ioredis';
import create from './create';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'unique_id'),
}));

jest.mock('ioredis', () => ({
  set: jest.fn(() => Promise.resolve()),
}));

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
    expect(uuid.v4)
      .toBeCalled();
    expect(Redis.set)
      .toBeCalledWith('unique_id', accessToken);
  });
});
