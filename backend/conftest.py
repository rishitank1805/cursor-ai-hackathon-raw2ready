"""Pytest configuration and fixtures."""

import os

# Set dummy API keys for tests that don't actually call APIs
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")
os.environ.setdefault("GOOGLE_API_KEY", "test-dummy")
