const jwt = require('jsonwebtoken');

// authService requires the DAL at module load, which pulls in every mongoose
// model. The token helpers under test never touch the database, so stub it out
// to keep these tests fast and connection-free.
jest.mock('../dal', () => ({
  users: {
    emailExists: jest.fn(),
    createUser: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getAllUsers: jest.fn(),
    getUserStatsByRole: jest.fn(),
  },
}));

const authService = require('../services/authService');

const SECRET = process.env.JWT_SECRET;
const USER_ID = '507f1f77bcf86cd799439011';

describe('authService.generateToken', () => {
  it('returns a three-part JWT', () => {
    const token = authService.generateToken(USER_ID);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('embeds the user id in the payload', () => {
    const decoded = jwt.verify(authService.generateToken(USER_ID), SECRET);

    expect(decoded.id).toBe(USER_ID);
  });

  it('sets an expiry seven days out', () => {
    const decoded = jwt.verify(authService.generateToken(USER_ID), SECRET);
    const sevenDays = 7 * 24 * 60 * 60;

    expect(decoded.exp - decoded.iat).toBe(sevenDays);
  });
});

describe('authService.verifyToken', () => {
  it('round-trips a token it generated', () => {
    const token = authService.generateToken(USER_ID);

    expect(authService.verifyToken(token).id).toBe(USER_ID);
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ id: USER_ID }, 'not-the-real-secret');

    expect(() => authService.verifyToken(forged)).toThrow('Invalid or expired token');
  });

  it('rejects a tampered payload', () => {
    const [header, , signature] = authService.generateToken(USER_ID).split('.');
    const swapped = Buffer.from(JSON.stringify({ id: 'attacker-id' })).toString('base64url');

    expect(() => authService.verifyToken(`${header}.${swapped}.${signature}`))
      .toThrow('Invalid or expired token');
  });

  it('rejects an already-expired token', () => {
    const expired = jwt.sign({ id: USER_ID }, SECRET, { expiresIn: '-1s' });

    expect(() => authService.verifyToken(expired)).toThrow('Invalid or expired token');
  });

  it('rejects a malformed token', () => {
    expect(() => authService.verifyToken('not-a-jwt')).toThrow('Invalid or expired token');
  });
});

describe('authService.generateTokenForUser', () => {
  const user = {
    _id: USER_ID,
    name: 'Test Farmer',
    email: 'farmer@example.com',
    password: '$2a$10$hashed.password.value',
    role: 'user',
    avatar: null,
    phone: '03001234567',
    location: { city: 'Faisalabad' },
    bio: '',
    isEmailVerified: true,
    authProvider: 'local',
    resetPasswordToken: 'secret-reset-token',
  };

  it('returns a usable token alongside the user', () => {
    const result = authService.generateTokenForUser(user);

    expect(authService.verifyToken(result.token).id).toBe(USER_ID);
    expect(result.user.email).toBe('farmer@example.com');
  });

  it('never leaks the password hash or reset token', () => {
    const { user: serialised } = authService.generateTokenForUser(user);

    expect(serialised).not.toHaveProperty('password');
    expect(serialised).not.toHaveProperty('resetPasswordToken');
  });

  it('exposes only the whitelisted profile fields', () => {
    const { user: serialised } = authService.generateTokenForUser(user);

    expect(Object.keys(serialised).sort()).toEqual([
      '_id', 'authProvider', 'avatar', 'bio', 'email',
      'isEmailVerified', 'location', 'name', 'phone', 'role',
    ]);
  });
});
