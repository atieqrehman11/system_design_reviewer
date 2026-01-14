#!/usr/bin/env bash
# This script runs the backend tests using a Python virtual environment.

set -euo pipefail

# Move to script directory (backend)
cd "$(dirname "$0")"

# If a virtualenv is not active, try to activate one (venv or .venv).
if [ -z "${VIRTUAL_ENV:-}" ]; then
	if [ -f "venv/bin/activate" ]; then
		# Activate project venv
		# shellcheck disable=SC1091
		. venv/bin/activate
	elif [ -f ".venv/bin/activate" ]; then
		. .venv/bin/activate
	else
		echo "No virtualenv found. Creating .venv..."
		python3 -m venv .venv
		# shellcheck disable=SC1091
		. .venv/bin/activate
		echo "Installing dependencies from requirements.txt into .venv..."
		pip install --upgrade pip
		if [ -f requirements.txt ]; then
			pip install -r requirements.txt
		fi
	fi
fi

# Set the PYTHONPATH to include the current directory so the 'app' module can be found.
export PYTHONPATH=.

echo "Running tests in virtualenv: ${VIRTUAL_ENV:-(unknown)}"
pytest