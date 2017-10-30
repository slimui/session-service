import deepFreeze from 'deep-freeze';
import {
  mergeSessions,
  filteredSession,
} from './utils';

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

  describe('filteredSession', () => {
    it('should filters keys from session', () => {
      const keys = ['global'];
      const globalSessionData = 'some global session data';
      const session = {
        global: globalSessionData,
        otherData: 'other data',
      };
      expect(filteredSession({
        keys,
        session,
      }))
        .toEqual({
          global: globalSessionData,
        });
    });

    it('should not filter when a * is passed in', () => {
      const keys = ['*'];
      const session = {
        global: 'some global session data',
        otherData: 'other data',
      };
      expect(filteredSession({
        keys,
        session,
      }))
        .toEqual(session);
    });

    it('should filter multiple values', () => {
      const keys = ['global', 'otherData'];
      const session = {
        global: 'some global session data',
        otherData: 'other data',
      };
      expect(filteredSession({
        keys,
        session,
      }))
        .toEqual(session);
    });
  });
});
