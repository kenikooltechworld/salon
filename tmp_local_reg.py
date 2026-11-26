# Test against local app to confirm contract behavior independent of live deploy/email config
import os, json, asyncio, sys
from httpx import ASGITransport, AsyncClient
sys.path.insert(0, r'C:\Users\kenik\OneDrive\Pictures\salon\app\server')
from app.main import app

async def main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as c:
        ts=int(__import__('time').time())
        legacy={"tenant":{"name":f"Codex Legacy {ts}","subdomain":f"codexlegacy{ts}"[-30:],"email":f"codexlegacy{ts}@example.com"},"user":{"email":f"codexlegacy{ts}@example.com","password":"Password123!","first_name":"Codex","last_name":"Legacy"}}
        r=await c.post('/api/v1/auth/register', json=legacy)
        print('legacy', r.status_code, r.text[:250])
        two={"salon_name":f"Codex Two {ts}","owner_name":"Codex Two","email":f"codextwo{ts}@example.com","phone":"+2348012345678","password":"Password123!","address":"123 Test St Lagos"}
        r2=await c.post('/api/v1/auth/register', json=two)
        print('two', r2.status_code, r2.text[:250])
asyncio.run(main())
