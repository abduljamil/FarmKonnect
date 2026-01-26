from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import amis_scraper
import uvicorn
import os
from datetime import datetime

app = FastAPI()

class ScrapeResponse(BaseModel):
    status: str
    message: str
    timestamp: str

def run_scraper_task():
    """Wrapper to run the scraper logic"""
    print(f"[{datetime.now()}] Starting scraping job...")
    try:
        scraper = amis_scraper.AMISScraper()
        data = scraper.scrape_commodity_prices()
        
        # Remove duplicates logic from main()
        seen = set()
        unique_data = []
        for item in data:
            key = (item['commodity'], item['city'], item['price'], item.get('price_type', ''))
            if key not in seen:
                seen.add(key)
                unique_data.append(item)
        
        print(f"[{datetime.now()}] Scraping completed. Found {len(unique_data)} unique records.")
        
        if unique_data:
            scraper.save_to_mongodb(unique_data)
            print(f"[{datetime.now()}] Data saved to MongoDB.")
        else:
            print(f"[{datetime.now()}] No data found.")
            
    except Exception as e:
        print(f"[{datetime.now()}] Error during scraping: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "online", "service": "FarmKonnect Scraper Service"}

@app.post("/scrape")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Trigger the scraper to run in the background"""
    background_tasks.add_task(run_scraper_task)
    return {
        "status": "started", 
        "message": "Scraping job started in background",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
