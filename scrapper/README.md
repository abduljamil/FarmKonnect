# AMIS Pakistan Data Scraper

Scrapes agricultural commodity prices from AMIS Pakistan (http://www.amis.pk/) and stores data in MongoDB for the FarmKonnect platform.

## Features

- Scrapes wholesale prices from 50+ cities across Pakistan
- Extracts 100+ commodities (fruits, vegetables, grains, pulses)
- Direct MongoDB integration for FarmKonnect database
- Automatic duplicate handling
- Timestamped data for historical tracking

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set MongoDB connection (optional):
```bash
set MONGO_URI=mongodb://localhost:27017/FarmKonnect
```

## Usage

```bash
python amis_scraper.py
```

This will scrape current market prices and save them to MongoDB.

## Data Coverage

**Cities**: Lahore, Faisalabad, Rawalpindi, Multan, Gujranwala, Sialkot, and 50+ more

**Commodities**: 
- Fruits: Apples, Bananas, Grapes, Dates, Pomegranate
- Vegetables: Potato, Onion, Tomato, Garlic, Ginger, Chilli
- Grains: Rice, Wheat, Maize
- Pulses: Gram, Masoor, Moong, Mash

## Configuration

Edit `config.py` to customize:
- Target cities
- Commodity filters
- Output formats
- Scraping intervals

## Output Formats

Data is saved to MongoDB with the following structure:
```json
{
  "commodity": "Potato Fresh",
  "city": "Lahore",
  "price": 7750.0,
  "unit": "Rs/100Kg",
  "date": "2025-11-23",
  "timestamp": "2025-11-23T12:00:00"
}
```

Also supports CSV and JSON file exports for offline analysis.

## Notes

- Respects website's robots.txt and includes appropriate delays
- Automatically removes duplicate records
- All prices in Pakistani Rupees per 100Kg
- For educational and research purposes only
