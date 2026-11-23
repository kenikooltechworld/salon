import requests, json
base="https://api.kenikoolsalon.com/api/v1"
# check deployed openapi for /public/bookings/statistics
r=requests.get(base.replace('/api/v1','')+"/openapi.json", timeout=30)
paths=r.json().get('paths',{})
for k in paths.keys():
    if 'bookings/statistics' in k or 'public/staff' in k or 'testimonials' in k:
        print(k)
