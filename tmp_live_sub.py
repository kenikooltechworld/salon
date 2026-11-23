import json, requests
base="https://api.kenikoolsalon.com/api/v1"
out={}
# 1. subdomain resolution via X-Forwarded-Host
for host, label in [('prince-salon.kenikoolsalon.com','ok_host'), ('unknown-salon.kenikoolsalon.com','bad_host'), ('api.kenikoolsalon.com','api_host')]:
    r=requests.get(f"{base}/public/salon-info", headers={"X-Forwarded-Host": host}, timeout=20)
    try: b=r.json()
    except Exception: b=r.text[:200]
    out[label]={'status':r.status_code,'body':b}
# 2. subdomain by name endpoint
r=requests.get(f"{base}/public/tenant/by-subdomain/prince-salon", timeout=20)
try:b=r.json()
except Exception:b=r.text[:200]
out['by_subdomain']={'status':r.status_code,'body':b}
r=requests.get(f"{base}/public/tenant/by-subdomain/does-not-exist", timeout=20)
try:b=r.json()
except Exception:b=r.text[:200]
out['by_subdomain_missing']={'status':r.status_code,'body':b}
print(json.dumps(out, indent=2, default=str)[:6000])
