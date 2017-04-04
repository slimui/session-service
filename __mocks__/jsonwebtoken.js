const jwt = jest.genMockFromModule('jsonwebtoken');
jwt.fakeToken = 'fakeToken';
jwt.sign = jest.fn((payload, secretOrPrivateKey, options, cb) => {
  if (secretOrPrivateKey === 'fail') {
    cb('failed to sign');
  } else {
    cb(undefined, jwt.fakeToken);
  }
});
export default jwt;
