import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="session")
def client():
    timeout = httpx.Timeout(
        connect=30.0,  # wait up to 30s to connect
        read=60.0,     # wait up to 60s for server response
        write=30.0,
        pool=30.0
    )
    with httpx.Client(base_url=BASE_URL, timeout=timeout) as c:
        yield c
