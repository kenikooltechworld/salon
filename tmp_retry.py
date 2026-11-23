import requests, json
base="https://api.kenikoolsalon.com/api/v1"
h={'X-Forwarded-Host':'prince-salon.kenikoolsalon.com'}
# The live error still 422 suggests old code; but openapi shows paths exist. Maybe old app instance? try a few times
for i in range(5):
    r=requests.get(base+"/public/bookings/statistics", headers=h, timeout=20)
    print(i, r.status_code)
