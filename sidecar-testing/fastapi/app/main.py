import os

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

from apilens import ApiLensClient, ApiLensConfig
from apilens.fastapi import instrument_app

load_dotenv()

app = FastAPI(title="API Lens Sidecar - FastAPI")

client = ApiLensClient(
    ApiLensConfig(
        api_key=os.getenv("APILENS_API_KEY", ""),
        base_url=os.getenv("APILENS_BASE_URL", "https://api.apilens.ai/api/v1"),
        environment=os.getenv("APILENS_ENVIRONMENT", "development"),
    )
)

instrument_app(app, client)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "framework": "fastapi"}


@app.get("/v1/orders/{order_id}")
def get_order(order_id: str) -> dict[str, str]:
    return {"order_id": order_id, "status": "fetched"}


class CreateOrderRequest(BaseModel):
    sku: str
    qty: int


@app.post("/v1/orders")
def create_order(payload: CreateOrderRequest) -> dict[str, str | int]:
    return {
        "order_id": "ord_sidecar_001",
        "sku": payload.sku,
        "qty": payload.qty,
        "status": "created",
    }
