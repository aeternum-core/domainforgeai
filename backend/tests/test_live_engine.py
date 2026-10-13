"""Tests for DomainForge live agent execution, streaming, and analysis tools."""
import os
import json
import pytest
import requests

from backend.app.services.agent_runner import (
    summarize_incident_logs,
    extract_spatial_clusters,
    evaluate_evidence_gaps,
)

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_summarize_incident_logs():
    records = [
        {"site": "Market Road", "date": "2024-07-03", "rainfall_mm": 86, "standing_water_cm": 34, "drain_status": "blocked"},
        {"site": "Market Road", "date": "2024-07-04", "rainfall_mm": 42, "standing_water_cm": 20, "drain_status": "blocked"},
        {"site": "School Lane", "date": "2024-07-18", "rainfall_mm": 54, "standing_water_cm": 8, "drain_status": "clear"},
    ]
    summary = summarize_incident_logs(records)
    assert summary["total_records"] == 3
    assert "Market Road" in summary["most_frequent_locations"]
    assert summary["most_frequent_locations"]["Market Road"] == 2
    assert summary["drain_status_distribution"].get("blocked") == 2
    assert summary["metrics_summary"]["standing_water_cm"]["max"] == 34


def test_extract_spatial_clusters():
    records = [
        {"site": "Market Road", "standing_water_cm": 34, "drain_status": "blocked"},
        {"site": "Market Road", "standing_water_cm": 20, "drain_status": "blocked"},
        {"site": "School Lane", "standing_water_cm": 8, "drain_status": "clear"},
    ]
    clusters = extract_spatial_clusters(records)
    assert clusters["total_clusters"] == 2
    assert clusters["critical_hotspots_count"] >= 1
    market_cluster = next(c for c in clusters["hotspots"] if "Market" in c["cluster_name"])
    assert market_cluster["incidents"] == 2
    assert market_cluster["severity_level"] == "Critical"


def test_evaluate_evidence_gaps():
    findings = {"summary": {}, "clusters": {}}
    obs = "Severe flooding along Market Road during rain"
    gaps = evaluate_evidence_gaps(findings, obs)
    assert gaps["total_gaps_identified"] >= 3
    variables = [v["variable"] for v in gaps["missing_engineering_variables"]]
    assert any("Elevation" in v for v in variables)
    assert any("Permeability" in v or "Infiltration" in v for v in variables)


def test_live_run_initialization_and_stream(session):
    # Instantiate template first
    r = session.post(f"{API}/templates/urban-waterlogging/instantiate")
    assert r.status_code == 200
    agent = r.json()
    agent_id = agent["id"]

    # 1. Initialize run via POST /api/agents/{agent_id}/runs
    init_res = session.post(
        f"{API}/agents/{agent_id}/runs",
        json={
            "use_sample": True,
            "inputs": {"situation": "Recurring inundation observed near Main junction."}
        }
    )
    assert init_res.status_code == 200
    init_data = init_res.json()
    assert "run_id" in init_data
    assert init_data["status"] == "running"
    run_id = init_data["run_id"]

    # 2. Consume SSE stream via GET /api/agents/{agent_id}/runs/{run_id}/stream
    stream_res = session.get(f"{API}/agents/{agent_id}/runs/{run_id}/stream", stream=True)
    assert stream_res.status_code == 200
    assert "text/event-stream" in stream_res.headers.get("Content-Type", "")

    events_received = []
    completed = False
    for line in stream_res.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            payload = json.loads(line[6:])
            events_received.append(payload)
            if payload.get("event") == "run_completed":
                completed = True
                assert "result" in payload
                assert payload["result"]["summary"]
                assert payload["result"]["quality_checklist"]
                break

    assert completed is True
    assert len(events_received) >= 4

    # 3. Retrieve persisted run via GET /api/agents/{agent_id}/runs/{run_id}
    detail_res = session.get(f"{API}/agents/{agent_id}/runs/{run_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "completed"
    assert len(detail["events"]) >= 4
    assert detail["result"]["raw_markdown"]


def test_public_endpoints(session):
    # Instantiate and publish an agent
    r = session.post(f"{API}/templates/urban-waterlogging/instantiate")
    agent = r.json()
    agent_id = agent["id"]

    # Run once to pass checklist
    session.post(f"{API}/agents/{agent_id}/run?mode=owner", json={"use_sample": True, "inputs": {"situation": "Field waterlogging observed."}})
    pub_res = session.post(f"{API}/agents/{agent_id}/publish")
    assert pub_res.status_code == 200
    slug = pub_res.json()["slug"]

    # Test GET /api/public/{slug}
    pub_get = session.get(f"{API}/public/{slug}")
    assert pub_get.status_code == 200
    assert pub_get.json()["slug"] == slug
    assert pub_get.json()["name"]

    # Test POST /api/public/{slug}/runs
    pub_run_res = session.post(f"{API}/public/{slug}/runs", json={"use_sample": True, "inputs": {}})
    assert pub_run_res.status_code == 200
    assert "run_id" in pub_run_res.json()
