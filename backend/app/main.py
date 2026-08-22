import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import advisories, auth, dashboard, diseases, farms, fields, ndvi, notifications, recommendations, weather
from app.core.config import settings
from app.core.database import Base, engine


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("krishiniti")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", description="Decision-support API for crop suitability, risk-adjusted profit and field monitoring.", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for router in [auth.router, farms.router, fields.router, recommendations.router, weather.router, ndvi.router, diseases.router, advisories.router, notifications.router, dashboard.router]:
    app.include_router(router, prefix=settings.api_prefix)


@app.get("/api/health", tags=["System"])
def health():
    return {"status": "healthy", "demo_mode": settings.demo_mode}

@app.get("/health", tags=["System"])
def health_root():
    return {"status": "healthy", "demo_mode": settings.demo_mode}


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Please check the information entered and try again.", "errors": exc.errors()})


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})
