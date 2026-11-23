import json, requests
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
out={}
for path in ['/public/services','/public/service-categories','/public/service-addons','/public/service-packages','/public/staff','/public/bookings/statistics','/public/bookings/testimonials?limit=5']:
    try:
        r=requests.get(base+path, headers=h, timeout=20)
        try:b=r.json()
        except Exception:b=r.text[:200]
        out[path]={'status':r.status_code,'body':b if not isinstance(b,dict) or len(json.dumps(b))<800 else {'keys':list(b.keys()),'count':len(b.get('services',b.get('categories',b.get('addons',b.get('packages',b.get('testimonials',[]))))) if isinstance(b,dict) else None}}
    except Exception as e:
        out[path]={'error':str(e)}
print(json.dumps(out, indent=2, default=str)[:7000])
