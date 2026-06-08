/**
 * Push notification service — uses Expo's free Push API to send messages to
 * mobile clients. The mobile app registers an `ExponentPushToken[...]` via
 * `expo-notifications` during login and POSTs it to /api/user/push-token,
 * which appends it to `User.expoPushTokens` (capped at 5 per user).
 *
 * This deliberately avoids FCM/APNs credentials by relaying through Expo's
 * server. If you later move to a custom dev client you can drop in the
 * `expo-server-sdk` package (drop-in API) without changing callers.
 */

const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_RE = /^ExponentPushToken\[.+\]$/;

const isValidToken = (t) => typeof t === 'string' && TOKEN_RE.test(t);

/**
 * Append a fresh push token to the user, deduping and capping at 5 entries.
 * Returns the updated array. Safe to call multiple times for the same token.
 */
const registerToken = async (userId, token) => {
  if (!isValidToken(token)) {
    throw new Error('Invalid Expo push token');
  }
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  const set = new Set(user.expoPushTokens || []);
  set.add(token);
  // Keep the 5 most recent tokens — drop the oldest if we go over.
  user.expoPushTokens = Array.from(set).slice(-5);
  await user.save();
  return user.expoPushTokens;
};

const unregisterToken = async (userId, token) => {
  await User.updateOne(
    { _id: userId },
    { $pull: { expoPushTokens: token } }
  );
};

/**
 * Send a push to all of a user's registered Expo tokens. Returns the
 * Expo API response array. Failures are logged but never thrown to the
 * caller — push is a best-effort enhancement, not a contract.
 *
 * @param {string} userId
 * @param {{ title: string, body: string, data?: object, sound?: string }} payload
 */
const sendToUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId).select('expoPushTokens');
    if (!user) return null;
    const tokens = (user.expoPushTokens || []).filter(isValidToken);
    if (tokens.length === 0) return null;
    return await sendToTokens(tokens, payload);
  } catch (err) {
    console.error('[push] sendToUser failed:', err.message);
    return null;
  }
};

/**
 * Low-level send to a raw token array. Used by sendToUser plus the alert
 * service when it already has the user's token list in memory.
 */
const sendToTokens = async (tokens, { title, body, data, sound = 'default' }) => {
  const validTokens = (Array.isArray(tokens) ? tokens : [tokens]).filter(isValidToken);
  if (validTokens.length === 0) return null;

  const messages = validTokens.map((to) => ({
    to,
    title: title || 'FarmKonnect',
    body: body || '',
    data: data || {},
    sound,
    priority: 'high',
    channelId: 'default',
  }));

  // Expo accepts up to 100 messages per request — we send in one batch per
  // user since 5 tokens is our cap, but the loop is here for future safety.
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.warn(`[push] Expo returned ${res.status}`);
        continue;
      }
      const body = await res.json();
      results.push(...(body?.data || []));

      // Clean up DeviceNotRegistered tokens so we stop trying to push them.
      body?.data?.forEach((r, i) => {
        if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') {
          const dead = chunk[i].to;
          User.updateMany({}, { $pull: { expoPushTokens: dead } }).exec();
        }
      });
    } catch (err) {
      console.error('[push] Expo POST failed:', err.message);
    }
  }
  return results;
};

module.exports = {
  registerToken,
  unregisterToken,
  sendToUser,
  sendToTokens,
};
