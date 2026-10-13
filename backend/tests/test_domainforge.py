"""End-to-end backend tests for DomainForge AI."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')
# Backend URL - try frontend .env first
if not BASE_URL or BASE_URL == 'http://localhost:3000':
    # Read from frontend .env if present
    env_candidates = [
        '/app/frontend/.env',
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env')),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env')),
    ]
    for env_file in env_candidates:
        if os.path.exists(env_file):
            try:
                with open(env_file) as f:
                    for line in f:
                        if line.startswith('REACT_APP_BACKEND_URL='):
                            val = line.split('=', 1)[1].strip().rstrip('/')
                            if val:
                                BASE_URL = val
                                break
            except Exception:
                pass
            if BASE_URL and BASE_URL != 'http://localhost:3000':
                break

if not BASE_URL or BASE_URL == 'http://localhost:3000':
    BASE_URL = os.environ.get('BACKEND_URL', 'http://127.0.0.1:8001')

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health & templates ---
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("mode") == "demo"


def test_list_templates(session):
    r = session.get(f"{API}/templates")
    assert r.status_code == 200
    tpls = r.json()
    ids = [t["template_id"] for t in tpls]
    assert "urban-waterlogging" in ids
    assert "accessibility-audit" in ids


# --- Instantiate template ---
@pytest.fixture(scope="module")
def waterlogging_agent(session):
    r = session.post(f"{API}/templates/urban-waterlogging/instantiate")
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["is_sample"] is True
    assert a.get("sample_data")
    return a


def test_get_agent(session, waterlogging_agent):
    r = session.get(f"{API}/agents/{waterlogging_agent['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == waterlogging_agent["id"]


def test_list_agents(session, waterlogging_agent):
    r = session.get(f"{API}/agents")
    assert r.status_code == 200
    assert any(a["id"] == waterlogging_agent["id"] for a in r.json())


# --- Generate proposal ---
def test_generate_proposal(session):
    r = session.post(f"{API}/agents/generate", json={
        "domain": "Public health",
        "problem": "Vaccine outreach gaps",
        "beneficiaries": "Rural clinics",
        "data_description": "clinic records",
        "outcome": "report",
        "name": "TEST_Health",
    })
    assert r.status_code == 200
    data = r.json()
    assert "proposal" in data
    assert data["proposal"].get("workflow")


# --- Owner run w/ sample data triggers test_passed ---
def test_owner_run_sample(session, waterlogging_agent):
    aid = waterlogging_agent["id"]
    r = session.post(f"{API}/agents/{aid}/run?mode=owner",
                     json={"use_sample": True,
                           "inputs": {"situation": "Recurring waterlogging after storms"}})
    assert r.status_code == 200, r.text
    run = r.json()
    assert run["source"] == "owner"
    assert len(run["steps"]) >= 1
    assert run["result"]

    # test_passed should now be true
    g = session.get(f"{API}/agents/{aid}").json()
    assert g["test_passed"] is True


def test_prepublish_ready(session, waterlogging_agent):
    r = session.get(f"{API}/agents/{waterlogging_agent['id']}/prepublish")
    assert r.status_code == 200
    data = r.json()
    assert data["ready"] is True
    assert all(i["ok"] for i in data["items"])


# --- Feedback -> new version ---
def test_feedback_versioning(session, waterlogging_agent):
    aid = waterlogging_agent["id"]
    r = session.post(f"{API}/agents/{aid}/feedback",
                     json={"text": "Show which data supports each conclusion"})
    assert r.status_code == 200
    data = r.json()
    assert data["version"] == 2
    assert data["changes"]
    # test_passed invalidated
    g = session.get(f"{API}/agents/{aid}").json()
    assert g["version"] == 2
    assert g["test_passed"] is False


# --- Publish flow (needs re-run after feedback) ---
def test_publish_flow(session, waterlogging_agent):
    aid = waterlogging_agent["id"]
    # Re-run to pass test again
    session.post(f"{API}/agents/{aid}/run?mode=owner",
                 json={"use_sample": True,
                       "inputs": {"situation": "Recurring waterlogging after storms"}})
    pre = session.get(f"{API}/agents/{aid}/prepublish").json()
    assert pre["ready"] is True

    r = session.post(f"{API}/agents/{aid}/publish")
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["published"] is True
    assert a["slug"]

    slug = a["slug"]
    # Public GET
    r2 = session.get(f"{API}/public/agents/{slug}")
    assert r2.status_code == 200
    assert r2.json()["slug"] == slug

    # Public run
    r3 = session.post(f"{API}/agents/{slug}/run",
                      json={"use_sample": True, "inputs": {}})
    assert r3.status_code == 200
    assert r3.json()["source"] == "public"

    # Unpublish
    r4 = session.post(f"{API}/agents/{aid}/unpublish")
    assert r4.status_code == 200
    assert r4.json()["published"] is False

    # Public run after unpublish -> 403
    r5 = session.post(f"{API}/agents/{slug}/run",
                      json={"use_sample": True, "inputs": {}})
    assert r5.status_code == 403

    # Public GET after unpublish -> 404
    r6 = session.get(f"{API}/public/agents/{slug}")
    assert r6.status_code == 404


def test_publish_blocked_without_test_run(session):
    # Instantiate accessibility sample
    r = session.post(f"{API}/templates/accessibility-audit/instantiate")
    aid = r.json()["id"]
    pre = session.get(f"{API}/agents/{aid}/prepublish").json()
    assert pre["ready"] is False
    # try publish -> 400
    pub = session.post(f"{API}/agents/{aid}/publish")
    assert pub.status_code == 400


def test_create_and_delete(session):
    gen = session.post(f"{API}/agents/generate", json={
        "domain": "x", "problem": "y", "outcome": "z", "name": "TEST_DEL"
    }).json()
    saved = session.post(f"{API}/agents",
                         json={"proposal": gen["proposal"]}).json()
    aid = saved["id"]
    assert session.get(f"{API}/agents/{aid}").status_code == 200
    assert session.delete(f"{API}/agents/{aid}").status_code == 200
    assert session.get(f"{API}/agents/{aid}").status_code == 404
