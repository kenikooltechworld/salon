import os, json, asyncio, sys
from httpx import ASGITransport, AsyncClient
sys.path.insert(0, r'C:\Users\kenik\OneDrive\Pictures\salon\app\server')
# Patch email send to avoid external dependency
import app.services.auth_service as auth_svc
import app.services.registration_service as reg_svc
async def fake_send(*args, **kwargs):
    return True
auth_svc.send_email = fake_send
reg_svc.send_email = fake_send
from app.main import app

async def main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as c:
        ts=int(__import__('time').time())
        legacy={"tenant":{"name":f"Codex Legacy {ts}","subdomain":f"codexlegacy{ts}"[-30:],"email":f"codexlegacy{ts}@test.local"},"user":{"email":f"codexlegacy{ts}@test.local","password":"Password123!","first_name":"Codex","last_name":"Legacy"}}
        r=await c.post('/api/v1/auth/register', json=legacy)
        print('legacy', r.status_code)
        print(list(r.json().keys()))
        two={"salon_name":f"Codex Two {ts}","owner_name":"Codex Two","email":f"codextwo{ts}@test.local","phone":"+2348012345678","password":"Password123!","address":"123 Test St Lagos"}
        r2=await c.post('/api/v1/auth/register', json=two)
        print('two', r2.status_code)
        print(list(r2.json().keys()))
asyncio.run(main())
