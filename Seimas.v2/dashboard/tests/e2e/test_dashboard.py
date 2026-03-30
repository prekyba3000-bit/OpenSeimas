"""Playwright E2E tests for the Skaidrus Seimas dashboard."""
import pytest
from playwright.sync_api import Page, expect


class TestDashboardLoad:
    """Tests for initial dashboard load."""
    
    def test_homepage_loads(self, page: Page, dashboard_url: str):
        """Dashboard homepage should load with title."""
        page.goto(dashboard_url)
        expect(page).to_have_title("Skaidrus Seimas")
    
    def test_header_visible(self, page: Page, dashboard_url: str):
        """Header with app name should be visible."""
        page.goto(dashboard_url)
        header = page.locator("h1")
        expect(header).to_contain_text("Skaidrus Seimas")
    
    def test_stats_cards_load(self, page: Page, dashboard_url: str):
        """Stats cards should appear after API response."""
        page.goto(dashboard_url)
        # Wait for stats to load (should not show "..." placeholder)
        page.wait_for_selector("text=Total MPs", timeout=10000)
        
        # Check that at least one stat has loaded (not "...")
        mp_stat = page.locator("text=Total MPs").locator("xpath=..").locator("span").last
        expect(mp_stat).not_to_have_text("...")


class TestActivityFeed:
    """Tests for the activity feed component."""
    
    def test_activity_section_exists(self, page: Page, dashboard_url: str):
        """Activity briefing section should exist."""
        page.goto(dashboard_url)
        expect(page.locator("text=Recent Activity Briefing")).to_be_visible()
    
    def test_activity_items_or_loading(self, page: Page, dashboard_url: str):
        """Activity should show items or loading state."""
        page.goto(dashboard_url)
        # Either activity items load, or loading message shows
        page.wait_for_selector(
            "text=Loading briefing data..., text=Voted",
            timeout=10000
        )


class TestHealthIndicator:
    """Tests for the system health indicator."""
    
    def test_orchestra_status_visible(self, page: Page, dashboard_url: str):
        """Orchestra Live indicator should be visible."""
        page.goto(dashboard_url)
        expect(page.locator("text=Orchestra Live")).to_be_visible()
