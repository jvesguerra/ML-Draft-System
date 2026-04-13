import requests, json
res = requests.get("https://mlbb.rone.dev/api/hero-detail/1?lang=en", timeout=15)
print(json.dumps(res.json(), indent=2))