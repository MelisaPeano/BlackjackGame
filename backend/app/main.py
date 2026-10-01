from fastapi import FastAPI

app = FastAPI(title="Blackjack Game API")

@app.get("/")
async def root():
    return {"message": "Welcome to the Blackjack Game API"}
