require("dotenv").config();
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
fetch(url)
  .then(r => r.json())
  .then(data => {
    if (!data.models) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    console.log("Models supporting generateContent:");
    data.models
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .forEach(m => console.log(`  ${m.name}`));
  })
  .catch(e => console.error(e));
