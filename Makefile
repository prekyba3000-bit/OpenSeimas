.PHONY: help dev build test lint typecheck clean

help:
	@echo "OpenSeimas Monorepo Tasks:"
	@echo "  make dev        - Run dashboard dev server"
	@echo "  make build      - Build dashboard production bundle"
	@echo "  make test       - Run all test suites (frontend & backend)"
	@echo "  make lint       - Run code linter"
	@echo "  make typecheck  - Run TypeScript type checker"
	@echo "  make clean      - Remove build artifacts and temporary caches"

dev:
	npm run dashboard:dev

build:
	npm run dashboard:build

test:
	npm run dashboard:test
	@if [ -d "Seimas.v2/.venv" ]; then set -a; [ -f .env ] && . ./.env; set +a; Seimas.v2/.venv/bin/python -m pytest Seimas.v2/tests/ || true; fi

lint:
	npm run dashboard:lint

typecheck:
	npm run dashboard:typecheck

clean:
	rm -rf Seimas.v2/dashboard/dist .pytest_cache
