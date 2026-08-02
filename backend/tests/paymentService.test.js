const paymentService = require('../services/paymentService');

// Demo mode short-circuits before any network call but still sleeps 1s to
// imitate gateway latency, so these need more than Jest's 5s default.
const DEMO_TIMEOUT = 15000;

describe('generateTxnRefNo', () => {
  it('uses the TXN prefix', () => {
    expect(paymentService.generateTxnRefNo()).toMatch(/^TXN\d+[A-Z0-9]+$/);
  });

  it('does not repeat across many calls', () => {
    const refs = new Set(Array.from({ length: 500 }, () => paymentService.generateTxnRefNo()));

    expect(refs.size).toBe(500);
  });
});

describe('isConfigured', () => {
  it('reports demo mode as configured', () => {
    expect(paymentService.isConfigured()).toEqual({ configured: true, mode: 'demo' });
  });

  it('reports sandbox as unconfigured while placeholder credentials are in place', () => {
    jest.resetModules();
    process.env.JAZZCASH_DEMO_MODE = 'false';
    const freshService = require('../services/paymentService');

    expect(freshService.isConfigured()).toEqual({ configured: false, mode: 'sandbox' });

    delete process.env.JAZZCASH_DEMO_MODE;
    jest.resetModules();
  });

  it('reports configured once real credentials are supplied', () => {
    jest.resetModules();
    process.env.JAZZCASH_DEMO_MODE = 'false';
    process.env.JAZZCASH_MERCHANT_ID = 'MC12345';
    process.env.JAZZCASH_PASSWORD = 'real-password';
    process.env.JAZZCASH_INTEGRITY_SALT = 'real-salt';
    const freshService = require('../services/paymentService');

    expect(freshService.isConfigured().configured).toBe(true);

    delete process.env.JAZZCASH_DEMO_MODE;
    delete process.env.JAZZCASH_MERCHANT_ID;
    delete process.env.JAZZCASH_PASSWORD;
    delete process.env.JAZZCASH_INTEGRITY_SALT;
    jest.resetModules();
  });
});

describe('initiatePayment (demo mode)', () => {
  it('succeeds with the gateway success code', async () => {
    const result = await paymentService.initiatePayment({
      amount: 5000,
      mobileNumber: '03001234567',
      cnic: '123456',
      description: 'Wheat order',
      transactionId: 'internal-1',
    });

    expect(result).toMatchObject({
      success: true,
      demo: true,
      responseCode: '000',
    });
  }, DEMO_TIMEOUT);

  it('echoes the amount and mobile number back to the caller', async () => {
    const result = await paymentService.initiatePayment({
      amount: 5000,
      mobileNumber: '03001234567',
    });

    expect(result.amount).toBe(5000);
    expect(result.mobileNumber).toBe('03001234567');
  }, DEMO_TIMEOUT);

  it('reports the raw amount in paisa, matching the gateway contract', async () => {
    const result = await paymentService.initiatePayment({
      amount: 5000,
      mobileNumber: '03001234567',
    });

    expect(result.rawResponse.pp_Amount).toBe(500000);
  }, DEMO_TIMEOUT);

  it('issues a transaction reference', async () => {
    const result = await paymentService.initiatePayment({
      amount: 100,
      mobileNumber: '03001234567',
    });

    expect(result.transactionId).toMatch(/^TXN/);
  }, DEMO_TIMEOUT);
});

describe('initiatePayout (demo mode)', () => {
  it('succeeds and issues a payout id', async () => {
    const result = await paymentService.initiatePayout({
      amount: 4500,
      mobileNumber: '03009876543',
      transactionId: 'internal-1',
    });

    expect(result.success).toBe(true);
    expect(result.payoutId).toMatch(/^TXN/);
  }, DEMO_TIMEOUT);
});

describe('verifyTransaction (demo mode)', () => {
  it('reports the reference as completed', async () => {
    const result = await paymentService.verifyTransaction('TXN123ABC');

    expect(result).toMatchObject({
      success: true,
      demo: true,
      status: 'completed',
      transactionId: 'TXN123ABC',
    });
  });
});
