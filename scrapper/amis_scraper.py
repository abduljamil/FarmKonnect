"""
AMIS Pakistan Commodity Price Scraper
Scrapes agricultural commodity prices from http://www.amis.pk/
Focuses on grain commodities from major cities in Pakistan
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import json
import time
import re


# Target cities for scraping
TARGET_CITIES = [
    'lahore', 'faisalabad', 'rawalpindi', 'gujranwala', 'multan',
    'sargodha', 'sialkot', 'bahawalpur', 'rahimyarkhan', 'rahim yar khan',
    'jhang', 'layyah', 'okara', 'chichawatni', 'bahawalnagar'
]

# Target grain commodities (English and Urdu)
GRAIN_KEYWORDS = [
    'wheat', 'rice', 'maize', 'millet', 'barley',
    'گندم', 'چاول', 'مکئی', 'جو'
]


class AMISScraper:
    """Scraper for AMIS Pakistan grain commodity prices"""
    
    def __init__(self):
        self.base_url = "http://www.amis.pk/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def scrape_commodity_prices(self):
        """Scrape prices for grain commodities from target cities"""
        try:
            url = f"{self.base_url}BrowsePrices.aspx?searchType=0"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
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
                            # Filter for grains only
                            if any(grain.lower() in text.lower() for grain in GRAIN_KEYWORDS):
                                commodity_links.append((text, href))
            
            print(f"Found {len(commodity_links)} grain commodities")
            
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
            # Construct full URL
            if href.startswith('http'):
                url = href
            elif href.startswith('/'):
                url = f"http://www.amis.pk{href}"
            else:
                url = f"{self.base_url}{href}"
            
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
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
                    
                    # Extract prices: Min(2), Max(3), FQP(4)
                    try:
                        min_price = cols[2].get_text(strip=True)
                        max_price = cols[3].get_text(strip=True)
                        fqp_price = cols[4].get_text(strip=True)
                        
                        # Add all available prices (Min, Max, FQP)
                        if min_price and min_price != '-':
                            try:
                                price = float(min_price.replace(',', ''))
                                prices_data.append({
                                    'commodity': commodity_name,
                                    'city': city,
                                    'price': price,
                                    'price_type': 'Min',
                                    'unit': 'Rs/100Kg',
                                    'date': current_date,
                                    'timestamp': datetime.now().isoformat()
                                })
                            except ValueError:
                                pass
                        
                        if max_price and max_price != '-':
                            try:
                                price = float(max_price.replace(',', ''))
                                prices_data.append({
                                    'commodity': commodity_name,
                                    'city': city,
                                    'price': price,
                                    'price_type': 'Max',
                                    'unit': 'Rs/100Kg',
                                    'date': current_date,
                                    'timestamp': datetime.now().isoformat()
                                })
                            except ValueError:
                                pass
                        
                        if fqp_price and fqp_price != '-':
                            try:
                                price = float(fqp_price.replace(',', ''))
                                prices_data.append({
                                    'commodity': commodity_name,
                                    'city': city,
                                    'price': price,
                                    'price_type': 'FQP',
                                    'unit': 'Rs/100Kg',
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
        print(f"✓ Saved to {filename} ({len(data)} records)")
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
        
        print(f"✓ Saved to {filename} ({len(data)} records)")
        return filename
    
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
        
        # Save to files
        scraper.save_to_csv(unique_data)
        scraper.save_to_json(unique_data)
        
        print("\n✓ Scraping completed!")
    else:
        print("\n⚠ No data scraped")


if __name__ == "__main__":
    main()
