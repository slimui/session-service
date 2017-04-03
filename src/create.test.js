import create from './create';

describe('create', () => {
  it('should call callback on success', () => {
    const accessToken = 'accessToken';
    const cb = jest.fn();
    const call = {
      request: { accessToken },
    };
    create(call, cb);
    expect(cb)
      .toBeCalled();
  });
});
