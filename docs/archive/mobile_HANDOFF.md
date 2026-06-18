# FarmKonnect Mobile — Session Handoff

**Date:** 2026-06-15 (Session 2) · 2026-06-10 (Session 1, below from §0)
**Scope:** `FarmKonnect-EC2-Backup/mobile` (React Native / Expo app)
**Status:** Working; SDK 54. Nothing committed to git. Session 2 added a desktop **web-preview** workflow + a large UI/UX pass.

---

# Session 2 — 2026-06-15 (UI/UX pass + desktop web preview)

## S2.0 TL;DR
Stood up a way to **run/drive the app on the desktop** (Expo Web + a local CORS proxy) so the UI can be screenshotted and clicked without a phone. Then did a broad UI/UX pass driven by the user's iterative feedback: fixed cramped/colliding layouts, the broken weather forecast, the price-chart overflow, conditional variety + coverage-based timeframe filters, removed all horizontal scroll from filters, added a price filter, redesigned filters (segmented controls + refined chips), cleaned up the Kisan FAB (auto-hide + removed glow), renamed Activity→Orders, and fixed the Profile screen (real avatar + real tappable reviews). Everything compiles under `babel-preset-expo`.

## S2.1 Desktop web-preview workflow (NEW — how to run without a phone)
The live API (`https://farmkonnect.app/api`) (a) does **not** CORS-allow the `localhost` web origin, and (b) issues the session JWT as an **httpOnly cookie** (not in the JSON body) — both invisible to a browser, so web login fails without help. The phone is unaffected.

- Installed web-only deps `react-dom` + `react-native-web` (SDK-54-aligned; web-only, no effect on Expo Go build).
- **`<repo>/../eth-bot/dev-cors-proxy.js`** — Node (built-ins only) proxy on `localhost:8090` → forwards to `farmkonnect.app`, injects `Access-Control-*` headers, **and lifts the `token` cookie into the JSON body** so `AuthContext`'s `response.data.token` works on web. Run it FIRST: `node eth-bot/dev-cors-proxy.js` (background).
- **`<repo>/../eth-bot/.claude/launch.json`** → server `farmkonnect-mobile-web`: `npm --prefix <abs mobile> run web -- --port 8081 --clear`, `autoPort:false`, `env:{ EXPO_PUBLIC_API_URL:"http://localhost:8090/api" }`. Started via the Claude Preview tools.
- Test at **390×844** (iPhone 13 Pro). Web rendering ≈ phone, not pixel-identical — good for layout/theme/flow, not a device-smoke-test substitute.
- **Gotchas:** Metro on Windows drops the server periodically (restart it; the proxy dies too — recheck/restart). A fresh server (`reused:false`) = new headless browser = **logged out** (empty localStorage); re-login needs the user's real creds. `EXPO_PUBLIC_API_URL` is inlined at transform time → restart with `--clear` after changing it.

## S2.2 What changed (verified live unless noted)
**Layout / responsiveness**
- Dashboard header: `flex:1`+gap so the greeting can't collide with the bell.
- Tab bar: `useSafeAreaInsets()` (was hardcoded height) + taller bar + `tabBarLabelStyle`; inactive tint `textFaint`→`gray400` (#9ca3af) for legibility.
- Market price cards: `cleanUnit()` strips the redundant "Rs/" so it stops wrapping to 3 lines; laid out as a 2×2 grid.
- **Removed horizontal scroll** from all filters → wrap/grid (Dashboard forecast row + market grid; PriceTrends commodity + timeframe; Marketplace categories; Create/Edit categories; Orders status). **Image carousels stay horizontal** (correct pattern).
- Commodity selector → **equal 3-column grid** (`width:'31%'`, `minHeight:46`, centered, `numberOfLines={2}`).  *(compiled; not yet screenshotted — preview was logged out)*

**Filters redesign**
- New reusable **`src/components/ui/SegmentedControl.js`** → used for Orders **Role** and PriceTrends **Timeframe**.
- Refined chips elsewhere (radius 10, flatter, clearer active state).
- Orders: added **ROLE** / **STATUS** labels so the two "All" chips aren't ambiguous.
- Marketplace: added **Min/Max (Rs) price filter** (backend already supports `minPrice`/`maxPrice`), debounced into the query. Fixed Max input clipping with `minWidth:0`. *(minWidth fix compiled, not screenshotted)*

**Data correctness**
- Weather forecast showed 0° — backend returns `{high,low}`, app read `temp`/`maxTemp`. Fixed mapping; shows high/low.
- PriceChart forecast tail overflowed the card — chart got no `width`; now measured via `onLayout`.
- PriceTrends: variety selector only renders when the crop has varieties (no "Default"); timeframe options filtered by a new **`/prices/coverage`** call (`getCoverage` added to `priceService`).

**FAB (KisanFAB) — rewritten**
- Auto-hides on scroll (translate+fade, driven by Dashboard `onScroll` → `animatedStyle` prop).
- Removed the pulsing ring + heavy green glow → clean flat button with a subtle neutral shadow.

**Naming / Profile**
- **Activity → Orders** (tab label + screen header; i18n en+ur).
- Profile: renders the **real avatar** (`getProfile().avatar`, initial fallback), **real rating** (`rating.average`/`count`), and the rating row is **tappable → MyReviews**.
- MyReviews showed "A user" for every reviewer — it was calling `getMyReviews` (reviews I *wrote*, reviewer=me). Switched to **`getUserReviews(myId)`** which populates the reviewer name/avatar. **Mobile-only fix, no backend redeploy.** *(compiled; not yet screenshotted)*

## S2.3 Files touched (Session 2)
`components/ui/SegmentedControl.js` (NEW), `components/ui/KisanFAB.js` (rewritten), `components/marketplace/PriceChart.js`, `screens/DashboardScreen.js`, `screens/marketplace/PriceTrendsScreen.js`, `screens/marketplace/MarketplaceScreen.js`, `screens/marketplace/CreateListingScreen.js`, `screens/marketplace/EditListingScreen.js`, `screens/transactions/TransactionsScreen.js`, `screens/profile/ProfileScreen.js`, `screens/profile/MyReviewsScreen.js`, `navigation/MainTabs.js`, `services/priceService.js` (+`getCoverage`), `i18n/index.js` (forecast/marketplace/role+status labels, Orders rename), `package.json` (+`react-dom`,`react-native-web`). Plus repo-external: `eth-bot/dev-cors-proxy.js`, `eth-bot/.claude/launch.json`. **No backend changes.**

## S2.4 Outstanding (Session 2)
- **Verify items not yet screenshotted** (preview was logged out after a restart): reviewer names, Max-input fix, tab-label contrast, commodity grid. Log in on `localhost:8081` (or check on phone) and confirm/tweak.
- Responsive/filter pass not yet applied to other screens (Chat/Conversations, EditProfile, ListingDetail, static pages, etc.).
- Everything from Session 1 §6 still applies (eas.projectId, backend jazzcashNumber redeploy, Google sign-in env, theme conversion of ~40 screens, web-parity widgets).

---

# Session 1 — 2026-06-10 (original handoff)

## 0. TL;DR

Audited the mobile app, then fixed security/config issues, downgraded the SDK to match Expo Go, fixed a startup crash, ripped out a broken styling system and re-themed the app, implemented several missing features, did a large i18n pass, compared web vs mobile, and built a heavy interactive price chart + a light/dark theme foundation.

Everything compiles and the iOS bundle builds (`HTTP 200`). A few things are **intentionally incomplete** — see [§6 Outstanding](#6-outstanding-work).

---

## 1. Environment / how to run

- **Expo SDK:** 54 (`expo@54.0.35`, `react-native@0.81.5`, `react@19.1.0`).
  - Downgraded from a (non-released-for-Expo-Go) SDK 56 because the user's Expo Go app is SDK 54.
- **Run:** `cd mobile && npx expo start` → scan QR in **Expo Go (SDK 54)**.
  - Dev URL: `exp://<LAN-IP>:8081` (was `exp://192.168.0.213:8081`).
  - Metro on Windows drops periodically — restart with `npx expo start -c` (the `-c` clears cache; needed after `babel.config.js` or dep changes).
- **Verify a build without a phone:**
  - Bundle: `curl -s -o out.txt -w "%{http_code}" "http://localhost:8081/index.bundle?platform=ios&dev=true"` → expect `200`.
  - Compile all source: babel-transform every `src/**/*.js` with `babel-preset-expo` (catches syntax errors fast).

---

## 2. New dependencies added

| Package | Why |
|---|---|
| `expo-secure-store` (~55→54 aligned) | Store the JWT in the OS keychain/keystore instead of AsyncStorage |
| `expo-constants` | Read `eas.projectId` for push token registration |
| `babel-plugin-transform-remove-console` (dev) | Strip `console.*` (except error/warn) from production bundles |

**Removed:** `nativewind` + `tailwindcss` (the className styling system — see §4).

---

## 3. Security / config fixes

- **JWT → SecureStore.** New `src/services/tokenStorage.js` (keychain/keystore via `expo-secure-store`, web fallback to AsyncStorage, **auto-migrates** any legacy plaintext token). `api.js` + `AuthContext.js` route the token through it; the non-sensitive `user` object still lives in AsyncStorage.
- **Native permissions** added to `app.json` `plugins` (`expo-image-picker`, `expo-location`, `expo-notifications`, `expo-secure-store`) with iOS/Android purpose strings — without these a standalone build crashes / gets App-Store-rejected.
- **Push `projectId`.** `pushNotifications.js` now passes `eas.projectId` (from `expo-constants`) to `getExpoPushTokenAsync()`. ⚠️ **`app.json` `extra.eas.projectId` is empty** — must run `eas init` (see §6).
- **API URL** is now `process.env.EXPO_PUBLIC_API_URL || 'https://farmkonnect.app/api'`.
- **Production logging** stripped via babel (keeps `error`/`warn`).
- **ErrorBoundary** (`src/components/ui/ErrorBoundary.js`) wraps the app — render errors show a recoverable screen instead of a white crash.
- **Chat** optimistic-send now de-dupes socket echoes and shows a "⚠ Not delivered" state on failure (was leaving messages stuck "pending").

---

## 4. UI fix — removed broken NativeWind, centralized colors

**Problem:** the reusable component library used **NativeWind v2** (`className`), which (a) doesn't render on RN 0.81 / React 19 / new arch, and (b) was light-themed on a dark app. Only `SignUpScreen` actually used it (`Input`, `Button`); 8 other className components were dead code.

**Fix:**
- Deleted 8 unused className components (`ui/Card`, `ui/Badge`, `ui/Loader`, `marketplace/ListingCard`, `marketplace/CategoryFilter`, `marketplace/ImageCarousel`, `chat/MessageBubble`, `chat/TypingIndicator`) + `tailwind.config.js`.
- Removed `nativewind/babel` from `babel.config.js`; removed `nativewind`/`tailwindcss` deps.
- Rewrote `ui/Button.js` + `ui/Input.js` in dark `StyleSheet`.
- Made `src/constants/colors.js` the canonical palette and migrated **842 inline hex literals → `COLORS.*` tokens across 40 files** (codemod; +266 JSX-attribute brace fixes). Value-preserving (no visual change).
- Fixed a `farmkonnect.com` typo → PrivacySecurity now navigates to the in-app `PrivacyPolicy`/`TermsOfService` screens.
- App version string now reads from `expo-constants` (was hardcoded "Build 42").

---

## 5. Features implemented

| Feature | Files |
|---|---|
| **Reject delivery** (buyer) | `transactionService.rejectDelivery` + button/modal in `TransactionDetailScreen` |
| **In-app email verification** | `screens/auth/VerifyEmailScreen.js` + route + `verify-email/:token` deep link |
| **"Email sent" screen** | `screens/auth/EmailSentScreen.js`; SignUp routes here (was an Alert) |
| **My Reviews** | `screens/profile/MyReviewsScreen.js` + Profile menu entry + route |
| **Privacy settings + Login history** | restored in `PrivacySecurityScreen` (backend routes exist); `userService` wrappers |
| **`jazzcashNumber` persistence** | `updateProfile` in **both** backend copies (`backend/` + `mobile/backend/`) ⚠️ needs API redeploy |
| **Heavy price chart (#7)** | `components/marketplace/PriceChart.js` → used in `PriceTrendsScreen` |
| **Light/Dark theme foundation (#5)** | `constants/colors.js` (palettes), `contexts/ThemeContext.js`, Settings toggle |
| **Sign-In Google crash fix** | `SignInScreen` — Google hook moved into a conditionally-mounted `<GoogleButton>` |

### Heavy chart (#7) — complete
Interactive SVG chart: Y gridlines + price labels, X date labels, gradient history area, dashed forecast tail with a shaded confidence band, min/max/latest markers, and a **draggable crosshair tooltip** (PanResponder). Replaced the old bare line chart.

### Theme (#5) — foundation + 1 screen only
`ThemeProvider` + `useColors()` / `useThemedStyles()` + persisted mode (AsyncStorage). **SettingsScreen** is converted and themes **live** via a working Dark Mode toggle (☀️/🌙). The rest of the app is **not yet converted** — see §6.

---

## 6. Outstanding work

### Must-do before a real build
1. **`eas.projectId`** — `app.json` `extra.eas.projectId` is `""`. Run `eas init` (or paste from expo.dev). Push notifications won't register on standalone builds without it.
2. **Backend `jazzcashNumber` fix needs deploy.** The app talks to the live API (`farmkonnect.app`), not the local `backend/` copies. The fix only takes effect once the production backend is redeployed.
3. **Google sign-in** needs `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `_ANDROID_` / `_WEB_` set (otherwise the button shows a "not configured" alert — which is correct/safe).

### Large, mechanical, incomplete passes
4. **Theme — convert remaining ~40 screens.** Each screen needs: `const C = useColors()` + move `StyleSheet.create` into a `makeStyles(C)` factory consumed via `useThemedStyles`, and **disambiguate the overloaded `COLORS.white`** (body text → `C.text`; white-on-green → `C.onPrimary`). See [§7 gotchas](#7-architecture-notes--gotchas). Suggested order: Profile → Dashboard → tab screens → the rest.
5. **i18n — finish inline labels + Urdu review.**
   - Done: all `Alert` dialogs, button/confirm labels, ChatScreen, CreateTransaction, TransactionDetail, CreateListing.
   - Remaining inline labels: EditProfile, MyListings, Notifications, Marketplace, Dashboard section titles, ListingDetail, Conversations, PriceAlerts, PriceTrends, static pages.
   - **Urdu**: the new `mobile.*` keys have **best-effort Urdu** I generated — flagged `// please review` in `src/i18n/index.js`. A native speaker should review.

### Web-parity gaps (optional; AdminPanel explicitly out of scope)
- Dashboard widgets: **MarketOutlookCard** (Buy/Hold/Sell signal), **AttentionStrip**, live **PriceTicker**.
- **Real-time in-app notifications** (order/support/price-alert dropdown + toast). Mobile currently uses push + a Notifications screen.
- **Transactions filters** (per-status + role + pagination; mobile only has All/Active/History).
- **Chat typing indicators**.
- **Methodology** ("How forecasts work") page.

---

## 7. Architecture notes / gotchas

- **RN `StyleSheet.create` captures color values at module load.** A runtime theme toggle can't retro-update already-created styles — hence the per-screen `useThemedStyles` conversion. (This is why #5 is a big job, not a flip.)
- **`COLORS.white` is overloaded.** The color codemod collapsed `#ffffff` and `#fff` into `COLORS.white`, used for *both* body text and white-on-primary text. When theming a screen, split them: text → `C.text`, on-green → `C.onPrimary`. Skipping this gives invisible white text on light backgrounds.
- **Shared i18n catalogs are off-limits.** `src/locales/en.json` and `ur.json` are byte-for-byte copies of the web app's. **Do not edit them.** Mobile-only keys go in `src/i18n/index.js` → `mobileExtras` (en + ur). Missing ur keys fall back to en (`fallbackLng: 'en'`).
- **Two backend copies exist:** top-level `backend/` (canonical / deployed) and `mobile/backend/` (a copy). Patch both, but only the deployed one affects the app.
- **Codemod caution:** when doing string-replacement codemods over `src/`, **exclude `src/i18n/index.js`** — a prior alert codemod over-matched the catalog's English values and corrupted it (caught & fixed). Prefer literal (non-regex) replacements; verify with a full bundle build after.
- **`newArchEnabled: true`** in app.json — matches Expo Go SDK 54 default (new architecture / Fabric).

---

## 8. Key files created this session

```
src/services/tokenStorage.js          # SecureStore JWT storage + migration
src/contexts/ThemeContext.js          # ThemeProvider, useColors, useThemedStyles
src/components/ui/ErrorBoundary.js     # top-level crash recovery
src/components/marketplace/PriceChart.js  # heavy interactive chart
src/screens/auth/VerifyEmailScreen.js
src/screens/auth/EmailSentScreen.js
src/screens/profile/MyReviewsScreen.js
HANDOFF.md                             # this file
```

Deleted: 8 NativeWind components + `tailwind.config.js` (see §4).

Heavily edited: `api.js`, `AuthContext.js`, `pushNotifications.js`, `app.json`, `babel.config.js`, `package.json`, `App.js`, `i18n/index.js`, `colors.js`, `SettingsScreen.js`, `PrivacySecurityScreen.js`, `TransactionDetailScreen.js`, `CreateTransactionScreen.js`, `CreateListingScreen.js`, `ChatScreen.js`, `PriceTrendsScreen.js`, `SignInScreen.js`, `SignUpScreen.js`, `AppNavigator.js`, `userService.js`, `transactionService.js`, + ~40 files touched by the color codemod, + `backend/controllers/userController.js` (both copies).

---

## 9. Verification status (at handoff)

- ✅ All `src/**/*.js` compile under `babel-preset-expo`.
- ✅ Both backend `userController.js` copies pass `node --check`.
- ✅ iOS bundle builds: `HTTP 200` (~11.6 MB).
- ✅ i18n catalog has no stray `t()` calls (post-incident verification).
- ⚠️ Not committed to git. Not run on a physical device by the author for every screen — recommend a device smoke test of the auth → marketplace → checkout → chat flow.
