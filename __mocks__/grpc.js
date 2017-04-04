const grpc = jest.genMockFromModule('grpc');
// proto.sessions.Sessions.service
grpc.load = jest.fn(() => ({
  sessions: {
    Sessions: {
      service: true,
    },
  },
}));
grpc.Server.prototype.start = jest.fn();
export default grpc;
