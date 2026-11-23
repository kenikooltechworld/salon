import json, requests
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
out={}
for path in ['/public/staff','/public/bookings/statistics','/public/bookings/testimonials?limit=5']:
    r=requests.get(base+path, headers=h, timeout=20)
    try:b=r.json()
    except Exception:b=r.text[:300]
    out[path]={'status':r.status_code,'body':b}
print(json.dumps(out, indent=2, default=str))
