from flask import Flask, request
import requests

app = Flask(__name__)

API_BASE = "https://api.tartousi-store1.com/client/api"
API_TOKEN = "KYQNQBmUT8mAvaTIZPXGalM-AXEeNwHASz8OVj6DBMiuJzFqxZKdVy9oaeeSOCaX"

@app.route('/<path:endpoint>')
def proxy(endpoint):
    url = f"{API_BASE}/{endpoint}"
    headers = {"api-token": API_TOKEN}
    
    resp = requests.get(url, headers=headers)
    return resp.json()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
