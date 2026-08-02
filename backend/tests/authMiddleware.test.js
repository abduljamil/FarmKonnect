jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../services/authService', () => ({ verifyToken: jest.fn() }));

const User = require('../models/User');
const authService = require('../services/authService');
const { protect, authorize, isAdmin, optionalAuth } = require('../middleware/auth');

const USER_ID = '507f1f77bcf86cd799439011';

/** Minimal express double: records status/json instead of writing a response. */
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({ cookies: {}, headers: {}, ...overrides });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('protect', () => {
  it('rejects a request carrying no token', async () => {
    const res = mockRes();
    const next = jest.fn();

    await protect(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a token from the cookie', async () => {
    const user = { _id: USER_ID, role: 'user' };
    authService.verifyToken.mockReturnValue({ id: USER_ID });
    User.findById.mockResolvedValue(user);
    const req = mockReq({ cookies: { token: 'cookie-token' } });
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(authService.verifyToken).toHaveBeenCalledWith('cookie-token');
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalled();
  });

  it('falls back to the Bearer authorization header', async () => {
    authService.verifyToken.mockReturnValue({ id: USER_ID });
    User.findById.mockResolvedValue({ _id: USER_ID });
    const req = mockReq({ headers: { authorization: 'Bearer header-token' } });

    await protect(req, mockRes(), jest.fn());

    expect(authService.verifyToken).toHaveBeenCalledWith('header-token');
  });

  it('prefers the cookie when both are present', async () => {
    authService.verifyToken.mockReturnValue({ id: USER_ID });
    User.findById.mockResolvedValue({ _id: USER_ID });
    const req = mockReq({
      cookies: { token: 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    });

    await protect(req, mockRes(), jest.fn());

    expect(authService.verifyToken).toHaveBeenCalledWith('cookie-token');
  });

  it('rejects an invalid token without calling next', async () => {
    authService.verifyToken.mockImplementation(() => {
      throw new Error('Invalid or expired token');
    });
    const res = mockRes();
    const next = jest.fn();

    await protect(mockReq({ cookies: { token: 'bad' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a valid token whose user no longer exists', async () => {
    authService.verifyToken.mockReturnValue({ id: USER_ID });
    User.findById.mockResolvedValue(null);
    const res = mockRes();
    const next = jest.fn();

    await protect(mockReq({ cookies: { token: 'orphan' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User not found' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('ignores an authorization header that is not a Bearer scheme', async () => {
    const res = mockRes();

    await protect(mockReq({ headers: { authorization: 'Basic dXNlcjpwYXNz' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });
});

describe('authorize', () => {
  it('lets an allowed role through', () => {
    const next = jest.fn();

    authorize('admin', 'user')({ user: { role: 'user' } }, mockRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('blocks a role outside the allow-list with 403', () => {
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')({ user: { role: 'user' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('isAdmin', () => {
  it('returns 401 when the request is unauthenticated', () => {
    const res = mockRes();
    const next = jest.fn();

    isAdmin({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for an authenticated non-admin', () => {
    const res = mockRes();
    const next = jest.fn();

    isAdmin({ user: { role: 'user' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets an admin through', () => {
    const next = jest.fn();

    isAdmin({ user: { role: 'admin' } }, mockRes(), next);

    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('continues as a guest when no token is present', async () => {
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('attaches the user when the token is valid', async () => {
    const user = { _id: USER_ID };
    authService.verifyToken.mockReturnValue({ id: USER_ID });
    User.findById.mockResolvedValue(user);
    const req = mockReq({ cookies: { token: 'good' } });
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalled();
  });

  it('continues as a guest — not an error — when the token is invalid', async () => {
    authService.verifyToken.mockImplementation(() => {
      throw new Error('Invalid or expired token');
    });
    const req = mockReq({ cookies: { token: 'bad' } });
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
