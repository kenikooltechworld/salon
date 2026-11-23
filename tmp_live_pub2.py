import json, requests
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
out={}
for path in ['/public/services','/public/service-categories','/public/service-addons','/public/service-packages','/public/staff','/public/bookings/statistics','/public/bookings/testimonials?limit=5']:
    try:
        r=requests.get(base+path, headers=h, timeout=20)
        try: b=r.json()
        except Exception: b=r.text[:300]
        if isinstance(b, dict) and len(json.dumps(b, default=str)) > 900:
            count = None
            for k in ['services','categories','addons','packages','testimonials','slots']:
                if k in b and isinstance(b[k], list):
                    count = len(b[k]); break
            out[path]={'status':r.status_code,'keys':list(b.keys()),'count':count}
        else:
            out[path]={'status':r.status_code,'body':b}
    except Exception as e:
        out[path]={'error':str(e)}
print(json.dumps(out, indent=2, default=str)[:8000])
