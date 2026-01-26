"""
AMIS Pakistan Commodity Price Scraper
Scrapes agricultural commodity prices from http://www.amis.pk/
Focuses on grain commodities from major cities in Pakistan
"""

import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timezone
import json
import time
import re
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Target cities for scraping
TARGET_CITIES = [
    'lahore', 'faisalabad', 'rawalpindi', 'gujranwala', 'multan',
    'sargodha', 'sialkot', 'bahawalpur', 'rahimyarkhan', 'rahim yar khan',
    'jhang', 'layyah', 'okara', 'chichawatni', 'bahawalnagar'
]

# Target commodities (English and Urdu)
COMMODITY_KEYWORDS = [
    'wheat', 'rice', 'cotton', 'sugar', 'maize', 'flour',
    'گندم', 'چاول', 'کپاس', 'چینی', 'مکئی', 'آٹا'
]

# Commodities to exclude
EXCLUDE_KEYWORDS = ['wheat straw', 'straw']


def parse_commodity_and_variety(name):
    """
    Parse commodity name into base commodity and variety.
    Handles cases like:
    - 'Rice (IRRI)' -> ('Rice', 'IRRI')
    - 'Rice Basmati' -> ('Rice', 'Basmati')
    - 'Rice Basmati (385)' -> ('Rice', 'Basmati 385')
    - 'Rice Basmati Super (New)' -> ('Rice', 'Basmati Super New')
    - 'Wheat' -> ('Wheat', None)
    """
    name = name.strip()
    
    # Rice varieties: capture everything after "Rice"
    # Pattern 1: Rice (Variety) - just parentheses, no space before
    if name.startswith('Rice ') or name == 'Rice':
        rest = name[4:].strip()  # Everything after "Rice"
        if not rest:
            return 'Rice', None
        
        # Pattern: Rice (IRRI)
        if rest.startswith('(') and rest.endswith(')'):
            variety = rest[1:-1].strip()
            return 'Rice', variety
        
        # Pattern: Rice Basmati (385)
        match = re.match(r'^(.+?)\s*\((.+?)\)$', rest)
        if match:
            variety = f"{match.group(1)} {match.group(2)}".strip()
            return 'Rice', variety
        
        # Pattern: Rice Basmati (no parentheses)
        return 'Rice', rest
    
    # Cotton varieties
    if name.startswith(('Cotton ', 'Seed Cotton ', 'Cotton(', 'Seed Cotton(')):
        # Normalize Seed Cotton to Cotton
        if name.startswith('Seed Cotton('):
            rest = name[11:].strip()  # "Seed Cotton" is 11 chars
        elif name.startswith('Seed Cotton '):
            rest = name[12:].strip()  # "Seed Cotton " is 12 chars with space
        elif name.startswith('Cotton('):
            rest = name[6:].strip()  # "Cotton" is 6 chars
        else:
            rest = name[7:].strip()  # "Cotton " is 7 chars with space
        
        if not rest:
            return 'Cotton', None
        
        # Pattern: Cotton(Phutti) or (Phutti)
        if rest.startswith('(') and rest.endswith(')'):
            variety = rest[1:-1].strip()
            return 'Cotton', variety
        
        # Pattern: Cotton Type (SubType)
        match = re.match(r'^(.+?)\s*\((.+?)\)$', rest)
        if match:
            variety = f"{match.group(1)} {match.group(2)}".strip()
            return 'Cotton', variety
        
        return 'Cotton', rest
    
    # Sugar varieties
    if name.startswith('Sugar '):
        rest = name[6:].strip()
        if not rest:
            return 'Sugar', None
        
        # Skip "Brown Sugar" and similar - they're different commodities
        if 'brown' in rest.lower():
            return None, None
        
        match = re.match(r'^(.+?)\s*\((.+?)\)$', rest)
        if match:
            variety = f"{match.group(1)} {match.group(2)}".strip()
            return 'Sugar', variety
        
        return 'Sugar', rest
    
    # Maize varieties
    if name.startswith('Maize '):
        rest = name[6:].strip()
        if not rest:
            return 'Maize', None
        
        match = re.match(r'^(.+?)\s*\((.+?)\)$', rest)
        if match:
            variety = f"{match.group(1)} {match.group(2)}".strip()
            return 'Maize', variety
        
        return 'Maize', rest
    
    # Wheat varieties
    if name.startswith('Wheat '):
        rest = name[6:].strip()
        if not rest:
            return 'Wheat', None
        
        match = re.match(r'^(.+?)\s*\((.+?)\)$', rest)
        if match:
            variety = f"{match.group(1)} {match.group(2)}".strip()
            return 'Wheat', variety
        
        return 'Wheat', rest
    
    # Flour varieties
    if 'Flour' in name:
        # Skip "Gram Flour" - different commodity
        if 'Gram' in name:
            return None, None
        
        # Pattern: Wheat Flour, Corn Flour, etc.
        match = re.match(r'^(.+?)\s+Flour\s*(.*)$', name, re.IGNORECASE)
        if match:
            variety = match.group(1).strip()
            extra = match.group(2).strip()
            if extra:
                variety = f"{variety} {extra}"
            return 'Flour', variety if variety else None
        
        return 'Flour', None
    
    # Exact matches for standalone commodities
    if name in ['Rice', 'Cotton', 'Sugar', 'Maize', 'Wheat', 'Flour']:
        return name, None
    
    # Default: return None to signal this should be skipped
    return None, None


def extract_unit(soup):
    """Extract unit from page"""
    text = soup.get_text(" ", strip=True)
    match = re.search(r"Rs\s*/\s*(\d+)\s*Kg", text, re.IGNORECASE)
    if match:
        kg_amount = match.group(1)
        return f"Rs/{kg_amount}Kg"
    return "Rs/40Kg"


def normalize_to_pakistani_units(commodity, price, unit):
    """
    Convert prices to Pakistani market standard units:
    - Wheat, Rice, Cotton, Maize: per 40kg (maund)
    - Sugar, Flour: per kg
    """
    # Extract kg amount from unit like "Rs/100Kg" or "Rs/40Kg"
    kg_match = re.search(r'/(\d+)Kg', unit, re.IGNORECASE)
    if not kg_match:
        return price, unit
    
    current_kg = int(kg_match.group(1))
    
    # For Sugar and Flour, convert to per kg
    if commodity in ['Sugar', 'Flour']:
        price_per_kg = price / current_kg
        return round(price_per_kg, 2), 'Rs/Kg'
    
    # For Wheat, Rice, Cotton, Maize - convert to per 40kg (maund)
    if commodity in ['Wheat', 'Rice', 'Cotton', 'Maize']:
        if current_kg == 40:
            return price, 'Rs/40Kg (Maund)'
        else:
            price_per_40kg = (price / current_kg) * 40
            return round(price_per_40kg, 2), 'Rs/40Kg (Maund)'
    
    return price, unit


class AMISScraper:
    """Scraper for AMIS Pakistan grain commodity prices"""
    
    def __init__(self):
        self.base_url = "http://www.amis.pk/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.max_retries = 3
        self.timeout = 60  # Increased from 30 to 60 seconds
    
    def make_request_with_retry(self, url, max_retries=None):
        """Make HTTP request with retry logic and exponential backoff"""
        if max_retries is None:
            max_retries = self.max_retries
        
        for attempt in range(max_retries):
            try:
                print(f"Attempting to connect... (Attempt {attempt + 1}/{max_retries})")
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()
                return response
            except requests.exceptions.Timeout:
                wait_time = (2 ** attempt) * 2  # Exponential backoff: 2, 4, 8 seconds
                if attempt < max_retries - 1:
                    print(f"Connection timeout. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    print(f"Connection timeout after {max_retries} attempts.")
                    raise
            except requests.exceptions.ConnectionError as e:
                wait_time = (2 ** attempt) * 2
                if attempt < max_retries - 1:
                    print(f"Connection error. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    print(f"Connection failed after {max_retries} attempts.")
                    raise
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 2
                    print(f"Request error: {str(e)}. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise
    
    def scrape_commodity_prices(self):
        """Scrape prices for grain commodities from target cities"""
        try:
            url = f"{self.base_url}BrowsePrices.aspx?searchType=0"
            response = self.make_request_with_retry(url)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            prices_data = []
            commodity_links = []
            
            # Find all commodity links
            tables = soup.find_all('table')
            for table in tables:
                cells = table.find_all('td')
                for cell in cells:
                    link = cell.find('a')
                    if link:
                        href = link.get('href', '')
                        text = link.get_text(strip=True)
                        if text and 'ViewPrices.aspx' in href:
                            # Filter for selected commodities only
                            if any(keyword.lower() in text.lower() for keyword in COMMODITY_KEYWORDS):
                                # Exclude unwanted commodities
                                if not any(exclude.lower() in text.lower() for exclude in EXCLUDE_KEYWORDS):
                                    commodity_links.append((text, href))
            
            print(f"Found {len(commodity_links)} grain commodities")
            print("Commodities found:")
            for name, _ in commodity_links:
                base, variety = parse_commodity_and_variety(name)
                # Handle Unicode characters in commodity names
                try:
                    print(f"  - {name} -> {base} ({variety if variety else 'no variety'})")
                except UnicodeEncodeError:
                    # For Windows console that can't display Urdu characters
                    safe_name = name.encode('ascii', 'replace').decode('ascii')
                    safe_base = base.encode('ascii', 'replace').decode('ascii') if base else 'None'
                    safe_variety = variety.encode('ascii', 'replace').decode('ascii') if variety else 'no variety'
                    print(f"  - {safe_name} -> {safe_base} ({safe_variety})")
            print()
            
            # Fetch prices for each commodity
            for i, (commodity_name, href) in enumerate(commodity_links, 1):
                if i % 5 == 0:
                    print(f"Scraping {i}/{len(commodity_links)}: {commodity_name}")
                
                commodity_data = self._fetch_commodity_detail(commodity_name, href)
                prices_data.extend(commodity_data)
                time.sleep(0.5)  # Be respectful to server
            
            return prices_data
        
        except requests.RequestException as e:
            print(f"Error: {e}")
            return []
    
    def _fetch_commodity_detail(self, commodity_name, href):
        """Fetch detailed prices for a specific commodity"""
        try:
            # Parse the commodity name first
            base_commodity, variety = parse_commodity_and_variety(commodity_name)
            
            # Target base commodities (after parsing)
            TARGET_BASE_COMMODITIES = ['Wheat', 'Rice', 'Cotton', 'Sugar', 'Maize', 'Flour']
            
            # Skip if the base commodity is not in our target list
            if base_commodity not in TARGET_BASE_COMMODITIES:
                return []
            
            # Construct full URL
            if href.startswith('http'):
                url = href
            elif href.startswith('/'):
                url = f"http://www.amis.pk{href}"
            else:
                url = f"{self.base_url}{href}"
            
            response = self.make_request_with_retry(url)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            prices_data = []
            
            # Find the price table (has headers: Min, Max, FQP)
            tables = soup.find_all('table')
            price_table = None
            
            for table in tables:
                rows = table.find_all('tr')
                if len(rows) < 2:
                    continue
                
                first_row_text = rows[0].get_text()
                if 'Min' in first_row_text and 'Max' in first_row_text and 'FQP' in first_row_text:
                    price_table = table
                    break
            
            if not price_table:
                return prices_data
            
            # Process data rows
            rows = price_table.find_all('tr')
            current_date = datetime.now().strftime('%Y-%m-%d')
            unit = extract_unit(soup)
            
            for row in rows[1:]:  # Skip header
                cols = row.find_all(['td', 'th'])
                
                if len(cols) >= 5:
                    city_text = cols[0].get_text(strip=True)
                    
                    # Extract city name (remove leading numbers)
                    city_match = re.match(r'^\d+(.+)$', city_text)
                    city = city_match.group(1) if city_match else city_text
                    
                    # Filter for target cities only
                    if not city or city.lower() not in TARGET_CITIES:
                        continue
                    
                    # Extract only FQP (average/frequently quoted price)
                    try:
                        fqp_price = cols[4].get_text(strip=True)
                        
                        # Add only FQP price
                        if fqp_price and fqp_price != '-':
                            try:
                                price = float(fqp_price.replace(',', ''))
                                
                                # Normalize price and unit to Pakistani market standards
                                normalized_price, normalized_unit = normalize_to_pakistani_units(
                                    base_commodity, price, unit
                                )
                                
                                prices_data.append({
                                    'commodity': base_commodity,
                                    'variety': variety,
                                    'city': city,
                                    'price': normalized_price,
                                    'price_type': 'FQP',
                                    'unit': normalized_unit,
                                    'date': current_date,
                                    'timestamp': datetime.now().isoformat()
                                })
                            except ValueError:
                                pass
                    except (IndexError, AttributeError):
                        continue
            
            return prices_data
        
        except Exception as e:
            return []
    
    def save_to_csv(self, data, filename=None):
        """Save scraped data to CSV file"""
        if not data:
            print("No data to save")
            return
        
        if filename is None:
            filename = "amis_prices.csv"
        
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"Saved to {filename} ({len(data)} records)")
        return filename
    
    def save_to_json(self, data, filename=None):
        """Save scraped data to JSON file"""
        if not data:
            print("No data to save")
            return
        
        if filename is None:
            filename = "amis_prices.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Saved to {filename} ({len(data)} records)")
        return filename

    def save_to_mongodb(self, data, max_retries=3):
        """Save scraped data to MongoDB, skipping unchanged prices"""
        if not data:
            print("No data to save to MongoDB")
            return

        mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
        if not mongo_uri:
            print("MONGO_URI not set. Skipping MongoDB save.")
            return

        # Retry logic for MongoDB connection
        client = None
        for attempt in range(max_retries):
            try:
                client = MongoClient(
                    mongo_uri,
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=20000
                )
                # Test connection
                client.admin.command('ping')
                print(f"MongoDB connected successfully")
                break
            except Exception as e:
                print(f"MongoDB connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 5
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    print("Failed to connect to MongoDB after all retries. Skipping save.")
                    return

        if not client:
            return
        try:
            db = client.get_default_database()
        except Exception:
            db = None
        if db is None:
            db = client["FarmKonnect"]
        collection = db["commodityprices"]

        inserted = 0
        updated = 0
        skipped = 0

        for item in data:
            commodity = item.get("commodity")
            variety = item.get("variety")
            city = item.get("city")
            price = item.get("price")
            price_type = item.get("price_type") or item.get("priceType")
            unit = item.get("unit")
            date_str = item.get("date")
            timestamp_value = item.get("timestamp")

            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            except Exception:
                date_obj = datetime.utcnow()

            if isinstance(timestamp_value, datetime):
                timestamp_obj = timestamp_value
            elif isinstance(timestamp_value, str):
                try:
                    timestamp_obj = datetime.fromisoformat(timestamp_value)
                except Exception:
                    timestamp_obj = datetime.utcnow()
            else:
                timestamp_obj = datetime.utcnow()

            filter_doc = {
                "commodity": commodity,
                "variety": variety,
                "city": city,
                "date": date_obj,
                "priceType": price_type,
            }

            existing = collection.find_one(filter_doc, {"price": 1})
            if existing and existing.get("price") == price:
                skipped += 1
                continue

            update_doc = {
                "$set": {
                    "commodity": commodity,
                    "variety": variety,
                    "city": city,
                    "price": price,
                    "priceType": price_type,
                    "unit": unit,
                    "date": date_obj,
                    "timestamp": timestamp_obj,
                    "lastUpdated": datetime.now(timezone.utc),
                }
            }

            result = collection.update_one(filter_doc, update_doc, upsert=True)

            if result.upserted_id:
                inserted += 1
            else:
                updated += 1

        client.close()
        print(f"MongoDB: inserted={inserted}, updated={updated}, skipped={skipped}")
    
    def get_summary_statistics(self, data):
        """Display summary statistics"""
        if not data:
            print("No data available")
            return
        
        df = pd.DataFrame(data)
        
        print("\n=== Summary ===")
        print(f"Total records: {len(df)}")
        print(f"Unique commodities: {df['commodity'].nunique()}")
        print(f"Cities covered: {df['city'].nunique()}")
        print(f"Price range: Rs {df['price'].min():.2f} - Rs {df['price'].max():.2f}")
        print(f"Average price: Rs {df['price'].mean():.2f}")


def main():
    """Run the scraper"""
    print("=== AMIS Grain Price Scraper ===\n")
    
    scraper = AMISScraper()
    
    print(f"Target: Grain commodities from {len(TARGET_CITIES)} cities\n")
    
    # Scrape data
    data = scraper.scrape_commodity_prices()
    
    # Remove duplicates
    seen = set()
    unique_data = []
    for item in data:
        key = (item['commodity'], item['city'], item['price'], item.get('price_type', ''))
        if key not in seen:
            seen.add(key)
            unique_data.append(item)
    
    print(f"\nTotal unique records: {len(unique_data)}")
    
    if unique_data:
        # Show summary
        scraper.get_summary_statistics(unique_data)
        
        # Save to MongoDB only
        scraper.save_to_mongodb(unique_data)
        
        print("\nScraping completed!")
    else:
        print("\nWARNING: No data scraped")


if __name__ == "__main__":
    main()
