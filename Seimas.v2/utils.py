"""Shared utilities for data ingestion scripts."""
import time
import requests
from functools import wraps


def retry_request(
    max_retries: int = 3,
    backoff_factor: float = 1.5,
    retry_on: tuple = (requests.exceptions.RequestException,)
):
    """
    Decorator for retrying HTTP requests with exponential backoff.
    
    Usage:
        @retry_request(max_retries=3)
        def fetch_data():
            return requests.get(url)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except retry_on as e:
                    last_exception = e
                    wait_time = backoff_factor ** attempt
                    print(f"[RETRY] Attempt {attempt + 1}/{max_retries} failed: {e}")
                    print(f"[RETRY] Waiting {wait_time:.1f}s before next attempt...")
                    time.sleep(wait_time)
            raise last_exception
        return wrapper
    return decorator


def fetch_with_retry(url: str, timeout: int = 30, max_retries: int = 3, **kwargs) -> requests.Response:
    """
    Fetch URL with automatic retry and exponential backoff.
    
    Args:
        url: The URL to fetch
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        **kwargs: Additional arguments passed to requests.get()
    
    Returns:
        Response object
    
    Raises:
        requests.RequestException: If all retries fail
    """
    last_exception = None
    backoff = 1.5
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=timeout, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            last_exception = e
            if attempt < max_retries - 1:
                wait_time = backoff ** attempt
                print(f"[RETRY] Request failed ({e}). Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
    
    raise last_exception
