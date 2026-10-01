.PHONY: dev prod test install

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

prod:
	uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000

test:
	pytest
