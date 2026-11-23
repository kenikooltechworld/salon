from pathlib import Path
p = Path('app/server/app/main.py')
text = p.read_text(encoding='utf-8')
old_import = '''from app.api.v1.router import api_router
from app.config import settings
from app.db import close_engine, init_engine
from app.lib.csrf import enforce_csrf
from app.lib.socketio import sio
from app.routes.root_routes import router as root_router'''
new_import = '''from app.api.v1.router import api_router
from app.config import settings
from app.db import SessionLocal, close_engine, init_engine
from app.lib.csrf import enforce_csrf
from app.lib.socketio import sio
from app.lib.tenant_context import resolve_tenant_from_request
from app.routes.root_routes import router as root_router'''
if old_import in text:
    text = text.replace(old_import, new_import)
old_mw = '''    @app.middleware("http")
    async def csrf_middleware(request: Request, call_next):
        enforce_csrf(request)
        return await call_next(request)'''
new_mw = '''    @app.middleware("http")
    async def subdomain_tenant_middleware(request: Request, call_next):
        try:
            async with SessionLocal() as session:
                await resolve_tenant_from_request(request, session)
        except Exception as e:
            from fastapi import HTTPException
            from fastapi.responses import JSONResponse
            if isinstance(e, HTTPException):
                return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
        return await call_next(request)

    @app.middleware("http")
    async def csrf_middleware(request: Request, call_next):
        enforce_csrf(request)
        return await call_next(request)'''
if old_mw in text and 'subdomain_tenant_middleware' not in text:
    text = text.replace(old_mw, new_mw)
p.write_text(text, encoding='utf-8')
print('subdomain_tenant_middleware' in text)
