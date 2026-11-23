from pathlib import Path
p = Path('app/server/app/main.py')
text = p.read_text(encoding='utf-8')
text = text.replace(
    'from app.db import SessionLocal, close_engine, init_engine',
    'from app.db import close_engine, get_session_factory, init_engine',
    1
)
text = text.replace(
'''    @app.middleware("http")
    async def subdomain_tenant_middleware(request: Request, call_next):
        try:
            async with SessionLocal() as session:
                await resolve_tenant_from_request(request, session)
        except Exception as e:
            from fastapi import HTTPException
            from fastapi.responses import JSONResponse
            if isinstance(e, HTTPException):
                return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
        return await call_next(request)''',
'''    @app.middleware("http")
    async def subdomain_tenant_middleware(request: Request, call_next):
        try:
            factory = get_session_factory() or init_engine() and get_session_factory()
            if factory is not None:
                async with factory() as session:
                    await resolve_tenant_from_request(request, session)
        except Exception as e:
            from fastapi import HTTPException
            from fastapi.responses import JSONResponse
            if isinstance(e, HTTPException):
                return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
        return await call_next(request)''',
    1
)
p.write_text(text, encoding='utf-8')
print('SessionLocal' not in text)
