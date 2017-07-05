const uniqueId = 'uniqueId';
const v4 = jest.fn(() => uniqueId);
v4.v4 = v4;
v4.uniqueId = uniqueId;
module.exports = v4;
