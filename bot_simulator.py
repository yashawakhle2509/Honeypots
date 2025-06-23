import requests
import random
import time
from faker import Faker

fake = Faker()

BASE_URL = "http://localhost:3000"  # Update if your server runs on a different host/port
NUM_REQUESTS = 100 # Customize based on desired load

# Bot-like User Agents
BOT_AGENTS = [
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "curl/7.68.0",
    "python-requests/2.25.1",
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P)"
]

def simulate_bot_action(i):
    uid = fake.uuid4()
    headers = {
        "User-Agent": random.choice(BOT_AGENTS),
        "Referer": fake.url()
    }

    try:
        action = random.choice([
            "hidden_link",
            "decoy_login",
            "dynamic_trap",
            "hidden_random",
            "fake_api",
            "decoy_logout"
        ])

        if action == "hidden_link":
            url = f"{BASE_URL}/api/hidden?uid={uid}"
            r = requests.get(url, headers=headers)
            print(f"[{i}] HIDDEN LINK → {r.status_code}")

        elif action == "decoy_login":
            data = {
                "username": fake.user_name(),
                "honeypot_field": "bot_triggered",
                "uniqueUserId": uid
            }
            r = requests.post(f"{BASE_URL}/api/decoy-login", headers=headers, data=data)
            print(f"[{i}] DECOY LOGIN → {r.status_code}")

        elif action == "dynamic_trap":
            token = fake.sha1()[:8]
            url = f"{BASE_URL}/trap/{uid}_{token}"
            r = requests.get(url, headers=headers)
            print(f"[{i}] DYNAMIC TRAP → {r.status_code}")

        elif action == "hidden_random":
            token = fake.sha1()[:10]
            url = f"{BASE_URL}/api/hidden-random?uid={uid}&token={token}"
            r = requests.get(url, headers=headers)
            print(f"[{i}] HIDDEN RANDOM LINK → {r.status_code}")

        elif action == "fake_api":
            url = f"{BASE_URL}/api/fake-endpoint?uid={uid}"
            r = requests.get(url, headers=headers)
            print(f"[{i}] FAKE API CALL → {r.status_code}")

        elif action == "decoy_logout":
            data = {
                "uniqueUserId": uid,
                "logout_honeypot": "bot_logout_attempt"
            }
            r = requests.post(f"{BASE_URL}/api/decoy-logout", headers=headers, data=data)
            print(f"[{i}] DECOY LOGOUT → {r.status_code}")

        time.sleep(random.uniform(0.05, 0.3))  # mimic human-like delay

    except Exception as e:
        print(f"[{i}] ERROR: {e}")

if __name__ == "__main__":
    for i in range(1, NUM_REQUESTS + 1):
        simulate_bot_action(i)