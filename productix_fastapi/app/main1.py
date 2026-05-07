from fastapi import FastAPI, Depends

from .router import uploads
from .router import Dashboard, Productivity_calculator, agent, ai_analysis, analytics, chatbot, login
from .router import auth, User
from .database import Base, engine
from .router import organization
from .router import Product
# from .router import Batch
from fastapi.middleware.cors import CORSMiddleware
# from .router import shift_entries
from .router import data_records
from fastapi.security import OAuth2PasswordBearer
from fastapi.openapi.utils import get_openapi
from .router import system_admin_router

# ── New Co-Pilot Routers (Phase 3–5) ──────────────────────────────────────────
from .router import feed
from .router import agents as agents_router
from .plugins.telco import router as telco_router
from .plugins.retail import router as retail_router
from .plugins.automobile import router as auto_router
from .router import formulas as formulas_router



#Base.metadata.drop_all(bind=engine)   # drops all tables
Base.metadata.create_all(bind=engine) 

app = FastAPI(title="Multi-tenant Productivity CRM")

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://productix.techohub.net",
    # add production URL here later, e.g. "https://yourdomain.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Allowed origins
    allow_credentials=True,
    allow_methods=["*"],         # Allow all HTTP methods
    allow_headers=["*"],         # Allow all headers
)

# Middleware to help handle trailing slashes for the packaged app
@app.middleware("http")
async def fix_trailing_slash(request, call_next):
    path = request.url.path
    # List of routes that we know exist and might need a slash handle
    api_roots = ["/products", "/batches", "/shifts", "/auth", "/login", "/analytics"]
    
    if path in api_roots:
        from fastapi.responses import RedirectResponse
        # Use 307 Temporary Redirect to preserve POST body and method!
        return RedirectResponse(
            url=str(request.url).replace(path, path + "/"),
            status_code=307
        )
    return await call_next(request)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Custom OpenAPI schema with security definition
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="My API",
        version="1.0.0",
        description="API with JWT auth",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

app.include_router(auth.router)
app.include_router(User.router)
app.include_router(organization.router)
app.include_router(Product.router)
# app.include_router(Batch.router)
# app.include_router(shift_entries.router)
app.include_router(agent.router)
app.include_router(Dashboard.router)
app.include_router(ai_analysis.router)
app.include_router(analytics.router)
app.include_router(chatbot.router)
app.include_router(login.router)
app.include_router(Productivity_calculator.router)
app.include_router(system_admin_router.router)
app.include_router(uploads.router)
app.include_router(data_records.router)

# ── Co-Pilot API Routers ──────────────────────────────────────────────────────
app.include_router(feed.router,          prefix="/api")
app.include_router(agents_router.router, prefix="/api")
app.include_router(telco_router.router,  prefix="/api")
app.include_router(retail_router.router, prefix="/api")
app.include_router(auto_router.router,   prefix="/api")
app.include_router(formulas_router.router, prefix="/api")
