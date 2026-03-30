FROM python:3.11-slim

WORKDIR /app

# Upgrade pip
RUN pip install --upgrade pip

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose port (Render sets $PORT env var)
EXPOSE 10000

# Start command
CMD ["sh", "-c", "gunicorn backend.main:app --bind 0.0.0.0:$PORT -k uvicorn.workers.UvicornWorker --workers 2"]
