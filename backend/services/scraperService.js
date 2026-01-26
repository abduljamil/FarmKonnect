const axios = require("axios");

let isRunning = false;
let lastRunAt = null;
let lastExitCode = null;
let lastStatus = null;
let lastError = null;

// URL of the scraper service (defined in docker-compose)
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || "http://scraper_service:8000";

const runScraper = async () => {
  if (isRunning) {
    return {
      started: false,
      status: "running",
      message: "Scraper is already running",
      lastRunAt,
      lastExitCode,
      lastStatus,
    };
  }

  isRunning = true;
  lastRunAt = new Date();
  lastStatus = "requesting";
  lastError = null;
  lastExitCode = null;

  try {
    console.log(`[ScraperService] Triggering scraper at ${SCRAPER_SERVICE_URL}/scrape`);
    const response = await axios.post(`${SCRAPER_SERVICE_URL}/scrape`);
    
    lastStatus = "running (background)";
    
    // reset flag after a short delay since the actual scraping is async in the other container
    // Ideally we would poll or use a webhook, but for now we just acknowledge the start.
    setTimeout(() => {
        isRunning = false;
    }, 5000); 

    return {
      started: true,
      status: "started",
      message: "Scraper job triggered successfully",
      data: response.data,
      startedAt: lastRunAt,
    };
  } catch (error) {
    console.error("[ScraperService] Failed to trigger scraper:", error.message);
    isRunning = false;
    lastStatus = "error";
    lastError = error.message;
    
    return {
      started: false,
      status: "error",
      message: `Failed to start scraper: ${error.message}`,
      error: error.message
    };
  }
};

const getScraperStatus = () => ({
  isRunning,
  lastRun: lastRunAt,
  lastExitCode,
  status: lastStatus,
  lastError,
});

module.exports = {
  runScraper,
  getScraperStatus,
};
