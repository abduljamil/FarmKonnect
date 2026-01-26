// OpenWeatherMap API Configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// Pakistan cities with coordinates for better accuracy
const PAKISTAN_CITIES = {
  "Lahore": { lat: 31.5497, lon: 74.3436 },
  "Karachi": { lat: 24.8607, lon: 67.0011 },
  "Islamabad": { lat: 33.6844, lon: 73.0479 },
  "Rawalpindi": { lat: 33.5651, lon: 73.0169 },
  "Faisalabad": { lat: 31.4504, lon: 73.135 },
  "Multan": { lat: 30.1575, lon: 71.5249 },
  "Peshawar": { lat: 34.0151, lon: 71.5249 },
  "Quetta": { lat: 30.1798, lon: 66.975 },
  "Sialkot": { lat: 32.4945, lon: 74.5229 },
  "Gujranwala": { lat: 32.1877, lon: 74.1945 },
  "Bahawalpur": { lat: 29.3956, lon: 71.6836 },
  "Sargodha": { lat: 32.0836, lon: 72.6711 },
  "Sukkur": { lat: 27.7052, lon: 68.8574 },
  "Jhang": { lat: 31.2781, lon: 72.3317 },
  "Okara": { lat: 30.8138, lon: 73.4534 },
};

// Farming tips based on weather conditions
const getFarmingTip = (weather, temp, humidity) => {
  const condition = weather?.main?.toLowerCase() || "";
  
  if (condition.includes("rain") || condition.includes("drizzle")) {
    return "Rainfall expected. Avoid pesticide spraying and delay harvesting of mature crops.";
  }
  if (condition.includes("thunderstorm")) {
    return "Thunderstorm warning! Secure livestock and avoid field work. Check drainage systems.";
  }
  if (temp > 35) {
    return "High temperature alert. Increase irrigation frequency and provide shade for livestock.";
  }
  if (temp < 10) {
    return "Cold conditions. Protect sensitive crops with mulching and cover young plants.";
  }
  if (humidity > 80) {
    return "High humidity may increase fungal disease risk. Monitor crops closely.";
  }
  if (humidity < 30) {
    return "Low humidity conditions. Consider increasing irrigation to prevent crop stress.";
  }
  if (condition.includes("clear") || condition.includes("sunny")) {
    return "Good conditions for wheat harvesting. Low humidity ideal for storage.";
  }
  if (condition.includes("cloud")) {
    return "Overcast conditions. Good time for transplanting and field preparation.";
  }
  
  return "Normal conditions. Continue regular farming activities.";
};

// Get current weather
const getCurrentWeather = async (req, res) => {
  try {
    const { city = "Lahore" } = req.query;
    
    if (!OPENWEATHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Weather API key not configured",
      });
    }

    // Get coordinates for the city
    const cityCoords = PAKISTAN_CITIES[city] || PAKISTAN_CITIES["Lahore"];
    
    const response = await fetch(
      `${BASE_URL}/weather?lat=${cityCoords.lat}&lon=${cityCoords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform to our format
    const weather = {
      location: `${city}, Punjab`,
      current: {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        wind: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        condition: data.weather[0]?.main || "Clear",
        description: data.weather[0]?.description || "",
        icon: data.weather[0]?.icon || "01d",
      },
      farmingTip: getFarmingTip(
        data.weather[0],
        data.main.temp,
        data.main.humidity
      ),
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: weather,
    });
  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch weather data",
      error: error.message,
    });
  }
};

// Get 5-day forecast
const getForecast = async (req, res) => {
  try {
    const { city = "Lahore" } = req.query;
    
    if (!OPENWEATHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Weather API key not configured",
      });
    }

    // Get coordinates for the city
    const cityCoords = PAKISTAN_CITIES[city] || PAKISTAN_CITIES["Lahore"];
    
    const response = await fetch(
      `${BASE_URL}/forecast?lat=${cityCoords.lat}&lon=${cityCoords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Group by day and get daily summary (noon reading)
    const dailyForecasts = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    data.list.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toDateString();
      const hour = date.getHours();
      
      // Take the noon reading or first available
      if (!dailyForecasts[dayKey] || (hour >= 11 && hour <= 14)) {
        dailyForecasts[dayKey] = {
          date: date,
          day: days[date.getDay()],
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
          condition: item.weather[0]?.main?.toLowerCase() || "clear",
          icon: item.weather[0]?.icon || "01d",
        };
      } else {
        // Update high/low
        dailyForecasts[dayKey].high = Math.max(
          dailyForecasts[dayKey].high,
          Math.round(item.main.temp_max)
        );
        dailyForecasts[dayKey].low = Math.min(
          dailyForecasts[dayKey].low,
          Math.round(item.main.temp_min)
        );
      }
    });
    
    // Convert to array and take first 5 days
    const forecast = Object.values(dailyForecasts)
      .slice(0, 5)
      .map((day, index) => ({
        ...day,
        day: index === 0 ? "Today" : day.day,
      }));
    
    res.json({
      success: true,
      data: {
        location: `${city}, Punjab`,
        forecast,
      },
    });
  } catch (error) {
    console.error("Forecast API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch forecast data",
      error: error.message,
    });
  }
};

// Get list of available cities
const getCities = async (req, res) => {
  res.json({
    success: true,
    data: Object.keys(PAKISTAN_CITIES),
  });
};

module.exports = {
  getCurrentWeather,
  getForecast,
  getCities,
};
