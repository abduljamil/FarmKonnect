/**
 * One-off script: verify the Gemini API key works.
 * Usage: node scripts/testGeminiKey.js
 * Reads GEMINI_API_KEY from .env or process env.
 */

require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

if (!API_KEY) {
  console.error("GEMINI_API_KEY missing. Set it in backend/.env first.");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

async function main() {
  console.log(`Testing model: ${MODEL}`);
  console.log(`Key starts with: ${API_KEY.slice(0, 6)}...`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Say 'OK' in one word." }] }],
      }),
    });
    const text = await res.text();
    console.log(`HTTP ${res.status}`);
    console.log(text.slice(0, 600));
  } catch (err) {
    console.error("Request failed:", err.message);
    process.exit(2);
  }
}

main();
