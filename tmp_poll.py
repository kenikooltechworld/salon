import requests, json
# same rndr-id suggests same instance; wait for deploy to replace. Check /health for uptime hint? no. Wait longer.
import time
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
for i in range(12):
    r=requests.get(base+"/public/bookings/statistics", headers=h, timeout=20)
    rid=r.headers.get('rndr-id','')
    print(i, r.status_code, rid)
    if r.status_code==200:
        print(r.text[:200])
        break
    time.sleep(20)
