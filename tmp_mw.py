from pathlib import Path
p = Path('app/server/app/main.py')
text = p.read_text(encoding='utf-8')
# add subdomain context middleware after CORS? It should set tenant context for host-resolved requests.
old = '''from app.api.v1.router import api_router
from app.config import settings
from app.db import database_health
from app.lib.csrf import csrf_protect
from app.lib.socketio import sio'''
new = '''from app.api.v1.router import api_router
from app.config import settings
from app.db import database_health
from app.lib.csrf import csrf_protect
from app.lib.socketio import sio
from app.lib.tenant_context import resolve_tenant_from_request
from app.db import SessionLocal'''
if old in text:
    text = text.replace(old, new)
old2 = '''@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    await csrf_protect(request)
    return await call_next(request)'''
new2 = '''@app.middleware("http")
async def subdomain_tenant_middleware(request: Request, call_next):
    # Resolve tenant for tenant-subdomain hosts; ignore non-public hosts.
    try:
        async with SessionLocal() as session:
            await resolve_tenant_from_request(request, session)
    except Exception as e:
        from fastapi import HTTPException
        from fastapi.responses import JSONResponse
        if isinstance(e, HTTPException):
            return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
        # Do not block requests on resolver failure; route handlers enforce tenant where needed.
    return await call_next(request)


@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    await csrf_protect(request)
    return await call_next(request)'''
if old2 in text and 'subdomain_tenant_middleware' not in text:
    text = text.replace(old2, new2)
p.write_text(text, encoding='utf-8')
print('ok')
