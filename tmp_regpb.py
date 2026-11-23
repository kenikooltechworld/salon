from pathlib import Path
p = Path('app/server/app/api/v1/router.py')
text = p.read_text(encoding='utf-8')
if 'public_booking as public_booking_routes' not in text:
    text = text.replace(
        'from app.api.v1.routes import public_services as public_service_routes',
        'from app.api.v1.routes import public_booking as public_booking_routes\nfrom app.api.v1.routes import public_services as public_service_routes',
        1
    )
    text = text.replace(
        'api_router.include_router(public_tenant_routes.router)',
        'api_router.include_router(public_tenant_routes.router)\napi_router.include_router(public_booking_routes.router)',
        1
    )
    p.write_text(text, encoding='utf-8')
    print('ok')
else:
    print('exists')
