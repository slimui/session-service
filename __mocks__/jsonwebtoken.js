const jwt = jest.genMockFromModule('jsonwebtoken');
jwt.fakeToken = 'fakeToken';
jwt.fakeSessionId = 'fakeSessionId';
jwt.sign = jest.fn((payload, secretOrPrivateKey, options, cb) => {
  if (secretOrPrivateKey === 'fail' || secretOrPrivateKey === 'anotherfail') {
    cb(new Error('failed to sign'));
  } else {
    cb(undefined, jwt.fakeToken);
  }
});
jwt.verify = jest.fn((token, secretOrPublicKey, options, cb) => {
  if (secretOrPublicKey === 'fail') {
    cb(new Error('failed to verify'));
  } else if (secretOrPublicKey === 'redisfail') {
    cb(undefined, {
      sessionId: 'fail',
    });
  } else if (secretOrPublicKey === 'failWithZero') {
    cb(undefined, {
      sessionId: 'failWithZero',
    });
  } else {
    cb(undefined, {
      sessionId: jwt.fakeSessionId,
    });
  }
});
module.exports = jwt;
