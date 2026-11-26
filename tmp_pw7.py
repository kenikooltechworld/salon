import os, json
from playwright.sync_api import sync_playwright
API='https://api.kenikoolsalon.com/api/v1'
EMAIL=os.getenv('TEST_EMAIL','princechaawa@gmail.com')
PASSWORD=os.getenv('TEST_PASSWORD','Newpassword123!')
errors=[]
def ok(n,c,e=''):
    m=('PASS' if c else 'FAIL')+' '+n
    if e: m+=' :: '+str(e)[:300]
    print(m)
    if not c: errors.append(m)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--disable-dev-shm-usage','--no-sandbox'])
    ctx=browser.new_context()
    # legacy contract still works
    legacy={
      "tenant":{"name":"Codex Legacy Compat","subdomain":f"codexlegacy{int(__import__('time').time())}","email":f"codexlegacy{int(__import__('time').time())}@example.com"},
      "user":{"email":f"codexlegacy{int(__import__('time').time())}@example.com","password":"Password123!","first_name":"Codex","last_name":"Legacy"}
    }
    # Note: different emails/subdomain above; better make consistent
    ts=int(__import__('time').time())
    email=f"codexlegacy{ts}@example.com"
    sub=f"codexlegacy{ts}"[-30:]
    legacy={"tenant":{"name":f"Codex Legacy {ts}","subdomain":sub,"email":email},"user":{"email":email,"password":"Password123!","first_name":"Codex","last_name":"Legacy"}}
    r=ctx.request.post(API+'/auth/register', data=legacy, timeout=30000)
    ok('legacy register status 201', r.status==201, f'{r.status} {r.text()[:300]}')
    if r.status==201:
        b=r.json(); ok('legacy response has tenant/user', 'tenant' in b and 'user' in b, list(b.keys()))
    # two-phase contract still works on live? may 503 due email; but should not 422 schema error
    ts2=ts+1
    two={"salon_name":f"Codex Two {ts2}","owner_name":"Codex Two","email":f"codextwo{ts2}@example.com","phone":"+2348012345678","password":"Password123!","address":"123 Test St Lagos"}
    r2=ctx.request.post(API+'/auth/register', data=two, timeout=30000)
    ok('two-phase register not schema-broken', r2.status in (200,503,400,409,429), f'{r2.status} {r2.text()[:300]}')
    browser.close()
print('TOTAL '+('PASS' if not errors else 'FAIL')+f' failures={len(errors)}')
for e in errors: print(e)
raise SystemExit(1 if errors else 0)
