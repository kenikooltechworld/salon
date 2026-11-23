from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import appointments as appointment_routes
from app.api.v1.routes import auth as auth_routes
from app.api.v1.routes import customers as customer_routes
from app.api.v1.routes import customer_preferences as customer_preference_routes
from app.api.v1.routes import health as health_routes
from app.api.v1.routes import media as media_routes
from app.api.v1.routes import notifications as notification_routes
from app.api.v1.routes import public_booking as public_booking_routes
from app.api.v1.routes import public_services as public_service_routes
from app.api.v1.routes import public_tenant as public_tenant_routes
from app.api.v1.routes import registration as registration_routes
from app.api.v1.routes import service_addons as service_addon_routes
from app.api.v1.routes import service_categories as service_category_routes
from app.api.v1.routes import service_commissions as service_commission_routes
from app.api.v1.routes import service_packages as service_package_routes
from app.api.v1.routes import services as service_routes
from app.api.v1.routes import settings as settings_routes
from app.api.v1.routes import staff as staff_routes
from app.api.v1.routes import tenants as tenant_routes

api_router = APIRouter()
api_router.include_router(health_routes.router)
api_router.include_router(registration_routes.router)
api_router.include_router(auth_routes.router)
api_router.include_router(tenant_routes.router)
api_router.include_router(settings_routes.router)
api_router.include_router(media_routes.router)
api_router.include_router(notification_routes.router)
api_router.include_router(public_tenant_routes.router)
api_router.include_router(public_booking_routes.router)
api_router.include_router(public_service_routes.router)
api_router.include_router(service_category_routes.router)
api_router.include_router(service_routes.router)
api_router.include_router(service_addon_routes.router)
api_router.include_router(service_package_routes.router)
api_router.include_router(service_commission_routes.router)
api_router.include_router(customer_routes.router)
api_router.include_router(customer_preference_routes.router)
api_router.include_router(staff_routes.router)
api_router.include_router(appointment_routes.router)
