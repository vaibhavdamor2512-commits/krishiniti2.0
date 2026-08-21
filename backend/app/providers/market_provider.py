from abc import ABC, abstractmethod

from app.core.config import settings


class MarketProvider(ABC):
    @abstractmethod
    def get_price(self, crop) -> float: ...


class MockMarketProvider(MarketProvider):
    def get_price(self, crop) -> float:
        return float(crop.base_market_price)


class RealMarketProvider(MarketProvider):
    def get_price(self, crop) -> float:
        raise RuntimeError("Real market provider is not configured")


def get_market_provider() -> MarketProvider:
    return MockMarketProvider() if settings.demo_mode or not settings.market_api_key else RealMarketProvider()
