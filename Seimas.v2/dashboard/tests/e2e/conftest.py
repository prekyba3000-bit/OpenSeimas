"""Pytest configuration for Playwright E2E tests."""
import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--dashboard-url",
        action="store",
        default="http://localhost:5173",
        help="Dashboard URL to test against"
    )


@pytest.fixture(scope="session")
def dashboard_url(request):
    """Get dashboard URL from command line or use default."""
    return request.config.getoption("--dashboard-url")
