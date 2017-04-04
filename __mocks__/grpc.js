const grpc = jest.genMockFromModule('grpc');
grpc.stubService = 'stub service';
grpc.load = jest.fn(() => ({
  sessions: {
    Sessions: {
      service: grpc.stubService,
    },
  },
}));
grpc.Server.prototype.start = jest.fn();
export default grpc;
