import json, requests
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
r=requests.get(base+"/public/bookings/statistics", headers=h, timeout=20)
print(r.status_code, r.text[:200])
r=requests.get(base+"/public/staff", headers=h, timeout=20)
print(r.status_code, r.text[:300])
