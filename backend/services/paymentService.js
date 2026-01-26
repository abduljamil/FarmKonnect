const crypto = require("crypto");

// JazzCash Configuration
const JAZZCASH_CONFIG = {
  merchantId: process.env.JAZZCASH_MERCHANT_ID || "MC00000",
  password: process.env.JAZZCASH_PASSWORD || "test123",
  integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || "testsalt",
  sandboxUrl:
    process.env.JAZZCASH_SANDBOX_URL ||
    "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction",
  productionUrl:
    "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction",
  isSandbox: process.env.JAZZCASH_SANDBOX !== "false",
  // Demo mode - no real API calls, just simulate
  isDemoMode: process.env.JAZZCASH_DEMO_MODE !== "false",
};

// Generate secure hash for JazzCash
const generateSecureHash = (params, integritySalt) => {
  // Sort keys and concatenate values
  const sortedKeys = Object.keys(params).sort();
  let hashString = integritySalt;

  sortedKeys.forEach((key) => {
    if (params[key] !== "" && params[key] !== null && params[key] !== undefined) {
      hashString += "&" + params[key];
    }
  });

  // Generate HMAC SHA256
  return crypto
    .createHmac("sha256", integritySalt)
    .update(hashString)
    .digest("hex")
    .toUpperCase();
};

// Generate unique transaction reference
const generateTxnRefNo = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Format date for JazzCash (yyyyMMddHHmmss)
const formatJazzCashDate = (date = new Date()) => {
  return date
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .substring(0, 14);
};

// Format expiry date (yyyyMMddHHmmss) - 1 hour from now
const formatExpiryDate = () => {
  const expiry = new Date(Date.now() + 60 * 60 * 1000);
  return formatJazzCashDate(expiry);
};

/**
 * Initiate JazzCash Mobile Wallet Payment
 * @param {Object} paymentData
 * @param {number} paymentData.amount - Amount in PKR
 * @param {string} paymentData.mobileNumber - Customer's JazzCash number (03xxxxxxxxx)
 * @param {string} paymentData.cnic - Last 6 digits of CNIC
 * @param {string} paymentData.description - Transaction description
 * @param {string} paymentData.transactionId - Your internal transaction ID
 */
const initiatePayment = async (paymentData) => {
  const { amount, mobileNumber, cnic, description, transactionId } = paymentData;

  // Demo mode - simulate successful payment
  if (JAZZCASH_CONFIG.isDemoMode) {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      demo: true,
      responseCode: "000",
      responseMessage: "Successful (Demo Mode)",
      transactionId: generateTxnRefNo(),
      amount: amount,
      mobileNumber: mobileNumber,
      rawResponse: {
        pp_ResponseCode: "000",
        pp_ResponseMessage: "Successful (Demo Mode)",
        pp_TxnRefNo: generateTxnRefNo(),
        pp_Amount: amount * 100,
        pp_MobileNumber: mobileNumber,
      },
    };
  }

  // Real API call (Sandbox or Production)
  const txnRefNo = generateTxnRefNo();
  const txnDateTime = formatJazzCashDate();
  const expiryDateTime = formatExpiryDate();

  const params = {
    pp_Language: "EN",
    pp_MerchantID: JAZZCASH_CONFIG.merchantId,
    pp_SubMerchantID: "",
    pp_Password: JAZZCASH_CONFIG.password,
    pp_BankID: "",
    pp_ProductID: "",
    pp_TxnRefNo: txnRefNo,
    pp_Amount: (amount * 100).toString(), // Amount in paisa
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: transactionId || txnRefNo,
    pp_Description: description || "FarmKonnect Payment",
    pp_TxnExpiryDateTime: expiryDateTime,
    pp_SecureHash: "",
    ppmpf_1: "", // Reserved
    ppmpf_2: "",
    ppmpf_3: "",
    ppmpf_4: "",
    ppmpf_5: "",
    pp_MobileNumber: mobileNumber,
    pp_CNIC: cnic || "",
  };

  // Generate secure hash
  params.pp_SecureHash = generateSecureHash(params, JAZZCASH_CONFIG.integritySalt);

  try {
    const apiUrl = JAZZCASH_CONFIG.isSandbox
      ? JAZZCASH_CONFIG.sandboxUrl
      : JAZZCASH_CONFIG.productionUrl;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    return {
      success: data.pp_ResponseCode === "000",
      demo: false,
      responseCode: data.pp_ResponseCode,
      responseMessage: data.pp_ResponseMessage,
      transactionId: data.pp_TxnRefNo || txnRefNo,
      amount: amount,
      mobileNumber: mobileNumber,
      rawResponse: data,
    };
  } catch (error) {
    console.error("JazzCash API Error:", error);
    return {
      success: false,
      demo: false,
      responseCode: "ERR",
      responseMessage: error.message || "Payment failed",
      transactionId: txnRefNo,
      amount: amount,
      mobileNumber: mobileNumber,
      rawResponse: null,
    };
  }
};

/**
 * Initiate JazzCash Payout (Platform to Seller)
 * @param {Object} payoutData
 * @param {number} payoutData.amount - Amount in PKR
 * @param {string} payoutData.mobileNumber - Seller's JazzCash number
 * @param {string} payoutData.transactionId - Reference transaction ID
 */
const initiatePayout = async (payoutData) => {
  const { amount, mobileNumber, transactionId } = payoutData;

  // Demo mode - simulate successful payout
  if (JAZZCASH_CONFIG.isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      demo: true,
      responseCode: "000",
      responseMessage: "Payout Successful (Demo Mode)",
      payoutId: generateTxnRefNo(),
      amount: amount,
      mobileNumber: mobileNumber,
    };
  }

  // Real payout would use JazzCash Disbursement API
  // This requires additional merchant account setup
  return {
    success: false,
    demo: false,
    responseCode: "NOT_IMPLEMENTED",
    responseMessage: "Payout API not configured. Please process manually.",
    payoutId: null,
    amount: amount,
    mobileNumber: mobileNumber,
  };
};

/**
 * Verify transaction status
 * @param {string} txnRefNo - JazzCash transaction reference
 */
const verifyTransaction = async (txnRefNo) => {
  if (JAZZCASH_CONFIG.isDemoMode) {
    return {
      success: true,
      demo: true,
      status: "completed",
      transactionId: txnRefNo,
    };
  }

  // Real verification would call JazzCash Inquiry API
  return {
    success: false,
    demo: false,
    status: "unknown",
    transactionId: txnRefNo,
    message: "Verification API not implemented",
  };
};

/**
 * Check if JazzCash is properly configured
 */
const isConfigured = () => {
  if (JAZZCASH_CONFIG.isDemoMode) {
    return { configured: true, mode: "demo" };
  }

  const hasCredentials =
    JAZZCASH_CONFIG.merchantId !== "MC00000" &&
    JAZZCASH_CONFIG.password !== "test123" &&
    JAZZCASH_CONFIG.integritySalt !== "testsalt";

  return {
    configured: hasCredentials,
    mode: JAZZCASH_CONFIG.isSandbox ? "sandbox" : "production",
  };
};

module.exports = {
  initiatePayment,
  initiatePayout,
  verifyTransaction,
  isConfigured,
  generateTxnRefNo,
  JAZZCASH_CONFIG,
};
