.PHONY: dev prod test install

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

prod:
	uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000

test:
	pytest
	
certs:
	mkdir -p certs
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -subj "/CN=localhost"

run-secure: certs
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --ssl-keyfile=./certs/key.pem --ssl-certfile=./certs/cert.pem --reload