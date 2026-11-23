import requests, json
# check x-render or server headers
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
r=requests.get(base+"/public/bookings/statistics", headers=h, timeout=20)
print(r.status_code)
print(dict(r.headers))
