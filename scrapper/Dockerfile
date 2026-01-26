FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (if any needed for pandas/lxml building)
# Using python-slim is usually enough, but sometimes gcc is needed. 
# We'll try without big build-deps first to keep image small.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["python", "server.py"]
