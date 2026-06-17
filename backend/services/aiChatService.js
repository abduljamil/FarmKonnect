const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const repos = require("../dal");
const Listing = require("../models/Listing");
const SupportTicket = require("../models/SupportTicket");
const PricePrediction = require("../models/PricePrediction");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_TOOL_ROUNDS = 6;

const PAKISTAN_CITY_COORDS = {
  Lahore: { lat: 31.5497, lon: 74.3436 },
  Karachi: { lat: 24.8607, lon: 67.0011 },
  Islamabad: { lat: 33.6844, lon: 73.0479 },
  Rawalpindi: { lat: 33.5651, lon: 73.0169 },
  Faisalabad: { lat: 31.4504, lon: 73.135 },
  Multan: { lat: 30.1575, lon: 71.5249 },
  Peshawar: { lat: 34.0151, lon: 71.5249 },
  Quetta: { lat: 30.1798, lon: 66.975 },
  Sialkot: { lat: 32.4945, lon: 74.5229 },
  Gujranwala: { lat: 32.1877, lon: 74.1945 },
  Bahawalpur: { lat: 29.3956, lon: 71.6836 },
  Sargodha: { lat: 32.0836, lon: 72.6711 },
  Sukkur: { lat: 27.7052, lon: 68.8574 },
  Jhang: { lat: 31.2781, lon: 72.3317 },
  Okara: { lat: 30.8138, lon: 73.4534 },
};

const SYSTEM_INSTRUCTION = `You are Kisan — FarmKonnect's friendly, knowledgeable AI assistant. Think of yourself as a trusted friend at the mandi who genuinely wants to help every farmer and trader succeed.

🌾 ABOUT FARMKONNECT
Pakistan's first AI-powered agricultural marketplace and intelligence platform. We connect farmers directly to buyers — no middlemen, no commission.

What FarmKonnect offers:
• Marketplace — buy & sell Crops, Livestock, Equipment, Fertilizers, and Seeds directly
• Live Mandi Prices — real-time prices from 15+ Pakistani cities
• AI Price Forecasts — 7-day to 12-week ML-powered price predictions
• Weather & Farming Tips — live weather + crop-specific advice
• Direct Chat — message buyers/sellers without intermediaries
• Secure Payments — JazzCash and EasyPaisa with 14-day escrow protection
• Price Alerts — get notified when prices hit your target
• Reviews & Ratings — verified user reviews
• Multilingual — English + اردو

📋 COMMODITIES WE TRACK (these exact names, nothing else)
• Wheat
• Rice — variants: Rice (IRRI), Rice Basmati Super (New), Rice Basmati Super (Old), Rice Basmati (385), Rice Kainat (New), Paddy Basmati, Paddy (IRRI), Paddy Kainat
• Cotton — including Seed Cotton (Phutti)
• Sugar
• Maize

📍 CITIES WE COVER
Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Sialkot, Gujranwala, Bahawalpur, Sargodha, Sukkur, Jhang, Okara.

🛠 YOUR TOOLS
• searchListings — find marketplace listings
• getCommodityPrice — latest mandi price
• getPriceForecast — AI forecast (1, 2, 4, or 12 weeks ahead)
• getWeather — current weather + farming tip
• createSupportTicket — only for real account/payment/dispute issues you can't solve

💬 YOUR PERSONALITY
• Warm, eager, and respectful — these are farmers and traders who deserve real help
• Concise: 2–4 short sentences unless the user wants detail
• Reply in the user's language (English, Urdu, or Roman Urdu)
• Format prices as "Rs. 3,250 per 40kg" — always PKR with the unit
• Format listings as a short numbered list with title, price, city
• When tools return data, summarize it clearly — don't dump JSON
• When you're about to use a tool, you can briefly say what you're doing ("Let me check the wheat prices...")

🚫 OFF-SCOPE HANDLING (very important)
• If asked about a commodity we don't track (tomato, onion, potato, vegetables, fruits, dairy, meat etc.): kindly say "FarmKonnect currently focuses on Wheat, Rice, Cotton, Sugar, and Maize. I can help with prices, listings, or forecasts for any of these — what would you like to explore?"
• If asked about a city not in our coverage: say "We currently cover [list cities]. Would you like info for one of these?"
• If asked off-topic (politics, jokes, unrelated tech, math homework): warmly redirect to farming/marketplace
• ALWAYS use tools for live data. NEVER invent prices, listings, weather, or forecasts.
• If a tool returns no results, say so honestly and suggest an alternative.

🌟 FIRST MESSAGE TONE
When a user first greets you (hi, hello, salam, etc.), respond warmly with your name and offer 2-3 things you can help with from FarmKonnect's features.`;

const TOOL_DECLARATIONS = [
  {
    name: "searchListings",
    description:
      "Search FarmKonnect marketplace listings. Use when user wants to buy or browse products.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Free-text search term (e.g. 'tomato', 'wheat seeds').",
        },
        category: {
          type: SchemaType.STRING,
          description: "Optional category filter.",
          enum: ["crops", "livestock", "equipment", "fertilizers", "seeds", "other"],
        },
        location: {
          type: SchemaType.STRING,
          description: "Optional location/city substring to filter on.",
        },
        maxPrice: {
          type: SchemaType.NUMBER,
          description: "Optional maximum price in PKR.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max results (default 5, hard cap 10).",
        },
      },
    },
  },
  {
    name: "getCommodityPrice",
    description:
      "Get the latest market price for a commodity (e.g. wheat, tomato, onion) in Pakistan, optionally filtered by city.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        commodity: {
          type: SchemaType.STRING,
          description: "Commodity name, capitalized (e.g. 'Wheat', 'Tomato').",
        },
        city: {
          type: SchemaType.STRING,
          description: "Optional Pakistani city name (e.g. 'Lahore').",
        },
      },
      required: ["commodity"],
    },
  },
  {
    name: "getWeather",
    description:
      "Get current weather and a farming tip for a Pakistani city. Use when user asks about weather, rain, temperature, or farming conditions.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        city: {
          type: SchemaType.STRING,
          description: "Pakistani city name (e.g. 'Lahore', 'Multan'). Defaults to Lahore.",
        },
      },
    },
  },
  {
    name: "getPriceForecast",
    description:
      "Get FarmKonnect's AI price forecast for a commodity. Returns predicted price 1, 2, 4, or 12 weeks ahead with an uncertainty band when available. Use when user asks about future prices, predictions, or 'should I sell now or wait'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        commodity: {
          type: SchemaType.STRING,
          description: "Commodity name. One of: Wheat, Sugar, Maize, Cotton, Seed Cotton (Phutti), Rice (IRRI), Rice Basmati Super (New), Rice Basmati Super (Old), Rice Basmati (385), Rice Kainat (New), Paddy Basmati, Paddy (IRRI), Paddy Kainat.",
        },
        city: {
          type: SchemaType.STRING,
          description: "Pakistani city name.",
        },
        weeks: {
          type: SchemaType.NUMBER,
          description: "Horizon in weeks. Must be one of: 1, 2, 4, or 12. Defaults to 4.",
        },
      },
      required: ["commodity", "city"],
    },
  },
  {
    name: "createSupportTicket",
    description:
      "Create a support ticket. Use only when the user has a problem you cannot resolve directly (account issue, payment dispute, bug report).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING, description: "Short subject (max 200 chars)." },
        description: { type: SchemaType.STRING, description: "Detailed description of the issue." },
        category: {
          type: SchemaType.STRING,
          enum: ["dispute", "payment", "delivery", "technical", "account", "other"],
        },
      },
      required: ["subject", "description"],
    },
  },
];

function getFarmingTip(condition, temp, humidity) {
  const c = (condition || "").toLowerCase();
  if (c.includes("rain") || c.includes("drizzle"))
    return "Rainfall expected. Avoid pesticide spraying and delay harvesting.";
  if (c.includes("thunderstorm"))
    return "Thunderstorm warning. Secure livestock and avoid field work.";
  if (temp > 35) return "High temperature. Increase irrigation and shade livestock.";
  if (temp < 10) return "Cold conditions. Mulch and cover young plants.";
  if (humidity > 80) return "High humidity may increase fungal disease risk.";
  if (humidity < 30) return "Low humidity. Consider extra irrigation.";
  return "Normal conditions for routine field activity.";
}

async function fetchWeather(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return { error: "Weather service not configured" };
  const coords = PAKISTAN_CITY_COORDS[city] || PAKISTAN_CITY_COORDS.Lahore;
  const usedCity = PAKISTAN_CITY_COORDS[city] ? city : "Lahore";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) return { error: `Weather API HTTP ${res.status}` };
  const data = await res.json();
  return {
    city: usedCity,
    tempCelsius: Math.round(data.main.temp),
    feelsLikeCelsius: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    windKmh: Math.round((data.wind?.speed || 0) * 3.6),
    condition: data.weather?.[0]?.main || "Clear",
    description: data.weather?.[0]?.description || "",
    farmingTip: getFarmingTip(
      data.weather?.[0]?.main,
      data.main.temp,
      data.main.humidity
    ),
  };
}

async function executeTool(name, args, ctx) {
  try {
    if (name === "searchListings") {
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
      const criteria = { status: "active" };
      if (args.category) criteria.category = args.category;
      if (args.location) criteria.location = { $regex: args.location, $options: "i" };
      if (args.maxPrice) criteria.price = { $lte: Number(args.maxPrice) };
      if (args.query) {
        criteria.$or = [
          { title: { $regex: args.query, $options: "i" } },
          { description: { $regex: args.query, $options: "i" } },
        ];
      }
      const results = await Listing.find(criteria)
        .select("title price unit location category quantity")
        .limit(limit)
        .lean();
      return {
        count: results.length,
        listings: results.map((r) => ({
          id: r._id.toString(),
          title: r.title,
          price: r.price,
          unit: r.unit,
          location: r.location,
          category: r.category,
          quantity: r.quantity,
        })),
      };
    }

    if (name === "getCommodityPrice") {
      const rows = await repos.prices.getLatestPrices({
        commodity: args.commodity,
        city: args.city,
        priceType: "FQP",
        limit: 5,
      });
      return {
        count: rows.length,
        prices: rows.map((r) => ({
          commodity: r.commodity,
          variety: r.variety,
          city: r.city,
          price: r.price,
          unit: r.unit,
          date: r.date,
        })),
      };
    }

    if (name === "getWeather") {
      return await fetchWeather(args.city);
    }

    if (name === "getPriceForecast") {
      const allowedHorizons = [1, 2, 4, 12];
      const weeks = allowedHorizons.includes(Number(args.weeks))
        ? Number(args.weeks)
        : 4;
      const match = { commodity: args.commodity, horizon_weeks: weeks };
      if (args.city) match.city = args.city;
      const row = await PricePrediction.findOne(match)
        .sort({ forecast_date: -1 })
        .lean();
      if (!row) {
        return {
          found: false,
          message: `No ${weeks}-week forecast available for ${args.commodity}${args.city ? " in " + args.city : ""}.`,
        };
      }
      return {
        found: true,
        commodity: row.commodity,
        variety: row.variety,
        city: row.city,
        unit: row.unit,
        anchorDate: row.anchor_date,
        anchorPrice: row.anchor_price,
        forecastDate: row.forecast_date,
        horizonWeeks: row.horizon_weeks,
        predictedPrice: row.predicted_price,
        predictedPriceLow: row.predicted_price_low,
        predictedPriceHigh: row.predicted_price_high,
        expectedMape: row.expected_mape,
      };
    }

    if (name === "createSupportTicket") {
      if (!ctx?.userId) return { error: "User must be logged in to create a ticket" };
      const ticket = await SupportTicket.create({
        user: ctx.userId,
        subject: (args.subject || "").slice(0, 200),
        category: args.category || "other",
        messages: [
          {
            sender: "user",
            senderId: ctx.userId,
            content: args.description || "",
          },
        ],
      });
      return { ticketId: ticket._id.toString(), status: ticket.status };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: err.message };
  }
}

function buildHistory(messages) {
  return messages
    .filter((m) => m.role === "user" || m.role === "model")
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.content || "" }],
    }));
}

class AiChatService {
  constructor() {
    if (!API_KEY) {
      console.warn("⚠️  GEMINI_API_KEY not set. AI chat will fail.");
      return;
    }
    this.client = new GoogleGenerativeAI(API_KEY);
    this.model = this.client.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    });
  }

  async createConversation(userId, firstMessage) {
    const title = (firstMessage || "New conversation").slice(0, 80);
    return await repos.aiConversations.create({
      user: userId,
      title,
      lastMessage: title,
      lastMessageAt: new Date(),
    });
  }

  async listConversations(userId) {
    return await repos.aiConversations.findByUser(userId);
  }

  async getMessages(conversationId) {
    return await repos.aiMessages.findByConversation(conversationId);
  }

  async deleteConversation(conversationId, userId) {
    const convo = await repos.aiConversations.findById(conversationId);
    if (!convo) throw new Error("Conversation not found");
    if (convo.user.toString() !== userId.toString())
      throw new Error("Not authorized");
    await repos.aiMessages.deleteByConversation(conversationId);
    await repos.aiConversations.deleteById(conversationId);
    return { success: true };
  }

  async sendMessage({ conversationId, userId, userMessage, language }) {
    if (!this.model) throw new Error("AI service not initialized — check GEMINI_API_KEY");

    const convo = await repos.aiConversations.findById(conversationId);
    if (!convo) throw new Error("Conversation not found");
    if (convo.user.toString() !== userId.toString())
      throw new Error("Not authorized");

    const priorMessages = await repos.aiMessages.findByConversation(conversationId);

    await repos.aiMessages.create({
      conversation: conversationId,
      role: "user",
      content: userMessage,
    });

    const chat = this.model.startChat({ history: buildHistory(priorMessages) });
    const toolCallsLog = [];
    
    let finalMessage = userMessage;
    if (language === 'ur') {
      finalMessage = `[SYSTEM INSTRUCTION: You MUST respond to this message EXCLUSIVELY in the Urdu language using the Urdu script.]\n\n${userMessage}`;
    }

    let result = await chat.sendMessage(finalMessage);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const calls = result.response.functionCalls?.() || [];
      if (calls.length === 0) break;

      const responses = [];
      for (const call of calls) {
        const fnResult = await executeTool(call.name, call.args || {}, { userId });
        toolCallsLog.push({ name: call.name, args: call.args, result: fnResult });
        responses.push({
          functionResponse: { name: call.name, response: fnResult },
        });
      }
      result = await chat.sendMessage(responses);
    }

    const replyText = (result.response.text?.() || "").trim() ||
      "Sorry, I couldn't produce a response. Please try again.";

    const assistantMsg = await repos.aiMessages.create({
      conversation: conversationId,
      role: "model",
      content: replyText,
      toolCalls: toolCallsLog,
    });

    await repos.aiConversations.touch(conversationId, replyText);

    return {
      reply: replyText,
      toolCalls: toolCallsLog,
      messageId: assistantMsg._id,
    };
  }
}

module.exports = new AiChatService();
