// Runs before any module is required by a test file.
//
// authService reads JWT_SECRET at module load and calls process.exit(1) when
// NODE_ENV is "production" without one, so both have to be in place before the
// first require or the whole suite dies on import.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-at-least-16-chars-long';
