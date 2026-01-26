"""
Configuration file for AMIS Scraper
Customize these settings according to your needs
"""

# Website Configuration
BASE_URL = "http://www.amis.pk/"
TIMEOUT = 30  # Request timeout in seconds

# User Agent
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

# Output Settings
OUTPUT_DIR = "output"  # Directory to save output files
DEFAULT_CSV_NAME = "amis_prices"  # Default CSV filename prefix
DEFAULT_JSON_NAME = "amis_prices"  # Default JSON filename prefix

# Data Settings
REMOVE_DUPLICATES = True  # Remove duplicate records
INCLUDE_TIMESTAMP = True  # Include timestamp in data

# Cities of Interest (leave empty for all cities)
CITIES_FILTER = []  # Example: ['Lahore', 'Faisalabad', 'Karachi']

# Commodities of Interest (leave empty for all commodities)
COMMODITIES_FILTER = []  # Example: ['Potato', 'Onion', 'Tomato']

# Price Filters
MIN_PRICE = 0  # Minimum price threshold (0 = no filter)
MAX_PRICE = 1000000  # Maximum price threshold

# Scraping Delays (to be respectful to the server)
REQUEST_DELAY = 1  # Delay between requests in seconds
RETRY_ATTEMPTS = 3  # Number of retry attempts on failure
RETRY_DELAY = 5  # Delay between retries in seconds

# Logging
LOG_LEVEL = "INFO"  # Options: DEBUG, INFO, WARNING, ERROR
LOG_FILE = "scraper.log"  # Log file name
ENABLE_CONSOLE_LOG = True  # Print logs to console

# Data Quality
VALIDATE_PRICES = True  # Validate price values
VALIDATE_DATES = True  # Validate date formats

# Export Options
EXPORT_CSV = True  # Export to CSV
EXPORT_JSON = True  # Export to JSON
EXPORT_EXCEL = False  # Export to Excel (requires openpyxl)

# Advanced Settings
USE_CACHE = False  # Cache scraped data
CACHE_DURATION = 3600  # Cache duration in seconds (1 hour)
PARALLEL_REQUESTS = False  # Use parallel requests (advanced)
