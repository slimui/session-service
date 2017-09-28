import deepFreeze from 'deep-freeze';
import { mergeSessions } from './utils';

describe('utils', () => {
  describe('mergeSessions', () => {
    it('should merge empty sessions', () => {
      const oldSesion = {};
      const newSession = {};
      const expectedResult = {};

      deepFreeze(oldSesion);
      deepFreeze(newSession);

      expect(mergeSessions({
        oldSesion,
        newSession,
      }))
        .toEqual(expectedResult);
    });

    it('should merge an empty newSession', () => {
      const oldSesion = {
        test: {},
      };
      const newSession = {};
      const expectedResult = {
        test: {},
      };

      deepFreeze(oldSesion);
      deepFreeze(newSession);

      expect(mergeSessions({
        oldSesion,
        newSession,
      }))
        .toEqual(expectedResult);
    });

    it('should merge newSession with empty oldSesion', () => {
      const oldSesion = {};
      const newSession = {
        test: {},
      };
      const expectedResult = {
        test: {},
      };

      deepFreeze(oldSesion);
      deepFreeze(newSession);

      expect(mergeSessions({
        oldSesion,
        newSession,
      }))
        .toEqual(expectedResult);
    });

    it('should merge newSession with oldSesion and override', () => {
      const oldSesion = {
        test: {},
      };
      const newSession = {
        test: {
          test: {},
        },
      };
      const expectedResult = {
        test: {
          test: {},
        },
      };

      deepFreeze(oldSesion);
      deepFreeze(newSession);

      expect(mergeSessions({
        oldSesion,
        newSession,
      }))
        .toEqual(expectedResult);
    });
  });
});
