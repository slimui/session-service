const jwt = jest.genMockFromModule('jsonwebtoken');
jwt.fakeToken = 'fakeToken';
jwt.fakeSessionId = 'fakeSessionId';
jwt.sign = jest.fn((payload, secretOrPrivateKey, options, cb) => {
  if (secretOrPrivateKey === 'fail' || secretOrPrivateKey === 'anotherfail') {
    cb('failed to sign');
  } else {
    cb(undefined, jwt.fakeToken);
  }
});
jwt.verify = jest.fn((token, secretOrPublicKey, options, cb) => {
  if (secretOrPublicKey === 'fail') {
    cb('failed to verify');
  } else {
    cb(undefined, {
      sessionId: jwt.fakeSessionId,
    });
  }
});
export default jwt;
