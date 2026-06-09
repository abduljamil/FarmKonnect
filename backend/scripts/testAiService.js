/**
 * End-to-end test of the AI service code path WITHOUT touching MongoDB.
 * Verifies: SDK works, system prompt loads, tool calling executes, response returns.
 * Usage: node scripts/testAiService.js "your question here"
 */

require("dotenv").config();
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const tools = [
  {
    functionDeclarations: [
      {
        name: "getWeather",
        description: "Get current weather for a Pakistani city.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            city: { type: SchemaType.STRING },
          },
        },
      },
    ],
  },
];

const fakeWeather = (args) => ({
  city: args.city || "Lahore",
  tempCelsius: 32,
  humidity: 55,
  condition: "Clear",
  farmingTip: "Good conditions for routine field activity.",
});

async function main() {
  const userMsg = process.argv[2] || "What's the weather in Lahore right now?";
  console.log(`User: ${userMsg}\n`);

  const client = new GoogleGenerativeAI(API_KEY);
  const model = client.getGenerativeModel({
    model: MODEL,
    systemInstruction:
      "You are FarmKonnect's AI assistant. Always use tools for live data.",
    tools,
  });

  const chat = model.startChat({ history: [] });
  let result = await chat.sendMessage(userMsg);

  for (let round = 0; round < 4; round++) {
    const calls = result.response.functionCalls?.() || [];
    if (calls.length === 0) break;
    console.log(`Tool round ${round + 1}: ${calls.map((c) => c.name).join(", ")}`);
    const responses = calls.map((call) => ({
      functionResponse: {
        name: call.name,
        response: fakeWeather(call.args || {}),
      },
    }));
    result = await chat.sendMessage(responses);
  }

  console.log(`\nAssistant: ${result.response.text()}`);
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(2);
});
