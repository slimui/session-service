# sessions

The session service is responsible for managing sessions in redis and verifying that a session is from a valid source. Verification is done with [jsonwebtokens](https://jwt.io/) (JWT), and only tokens created by this service are considered valid sessions.

JWT session tokens contain the following data:

```json
{
  "sessionId": "v1_userId_ABC123",
  "sessionVersion": "v1"
}
```

The clients (Account, Analyze, Publish) all use the session version to route to the correct version of the session service. This means that multiple session services can be running in parallel with different versions. This is useful for migrations and upgrades of the session service and the redis instance that backs the service.

## API

Each of the API methods are exposed as RPC endpoints with [Micro RPC](https://github.com/bufferapp/micro-rpc) under the `/rpc` route.

### Create

Stores a new session for a user

**session** - _object_ - javascript object
**userId** - _string_ - the databse userId

Returns an _object_ with a JWT token

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ"
}
```

### Get

Verifies and returns a filtered session object

**token** - _string_ - JWT token
**sessionVersion** - _string_ - version of the session
**keys** - _[string] optional_ - "\*" for all keys, otherwise grab the named keys

```json
{
  "global": {
    "userId": "ABC_123",
  },
  "publish": {
    "stuff": "for publish"
  }
}
```

### Update

Verifies and updates a session object. Uses [Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) to merge new session into old session.

**token** - _string_ - JWT token
**sessionVersion** - _string_ - version of the session
**session** - _object_ session object to be merged into existing session

returns 200 OK if update was a success

### Destroy

Verifies and deletes a session from the redis database

**token** - _string_ - JWT token
**sessionVersion** - _string_ - version of the session

returns 200 OK if destroy was a success
