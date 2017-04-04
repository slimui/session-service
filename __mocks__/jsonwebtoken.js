const jwt = jest.genMockFromModule('jsonwebtoken');
jwt.fakeToken = 'fakeToken';
jwt.fakeSessionId = 'fakeSessionId';
jwt.sign = jest.fn((payload, secretOrPrivateKey, options, cb) => {
  if (secretOrPrivateKey === 'fail') {
    cb('failed to sign');
  } else {
    cb(undefined, jwt.fakeToken);
  }
});
jwt.verify = jest.fn((token, secretOrPublicKey, options, cb) => {
  cb(undefined, {
    sessionId: jwt.fakeSessionId,
  });
});
export default jwt;
