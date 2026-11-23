import json, requests
base="https://api.kenikoolsalon.com/api/v1"
out={}
for host, label in [('prince-salon.kenikoolsalon.com','ok_host'), ('unknown-salon.kenikoolsalon.com','bad_host'), ('api.kenikoolsalon.com','api_host')]:
    try:
        r=requests.get(f"{base}/public/salon-info", headers={"X-Forwarded-Host": host}, timeout=20)
        try: b=r.json()
        except Exception: b=r.text[:200]
        out[label]={'status':r.status_code,'body':b}
    except Exception as e:
        out[label]={'error':str(e)}
for path,label in [('/public/tenant/by-subdomain/prince-salon','by_subdomain'),('/public/tenant/by-subdomain/does-not-exist','by_subdomain_missing')]:
    try:
        r=requests.get(base+path, timeout=20)
        try:b=r.json()
        except Exception:b=r.text[:200]
        out[label]={'status':r.status_code,'body':b}
    except Exception as e:
        out[label]={'error':str(e)}
print(json.dumps(out, indent=2, default=str)[:6000])
