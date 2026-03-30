import pytest
import os
from analyze_conflicts import analyze_lrt_conflicts

def test_analyze_conflicts_no_env():
    # Test that it handles missing DB_DSN gracefully
    if "DB_DSN" in os.environ:
        del os.environ["DB_DSN"]
    
    # This should just print and return
    analyze_lrt_conflicts()
    assert True # Verification that it didn't crash
