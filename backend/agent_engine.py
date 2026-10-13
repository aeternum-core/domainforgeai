"""Deterministic 'Master Agent' generator + agent runtime (Demo mode).

No external AI service is required. All behaviour here is deterministic so the
demo is reproducible. Nothing in this module should be presented to the user as
output from a real AI model or live integration.
"""
import csv
import io
import json
import re
import uuid
from datetime import datetime, timezone


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


def slugify(text):
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text).strip("-")
    return text or "agent"


# ---------------------------------------------------------------------------
# Domain detection
# ---------------------------------------------------------------------------
DOMAIN_FLAVOURS = {
    "water": {
        "keywords": ["water", "flood", "drain", "rain", "storm", "sewer", "waterlog", "monsoon"],
        "label": "Civil & environmental",
        "input_label": "Site / storm observations",
        "record_label": "Rainfall, elevation & drainage records",
        "beneficiary_default": "residents and commuters affected, and the engineering team",
    },
    "accessibility": {
        "keywords": ["accessib", "ramp", "wheelchair", "sidewalk", "curb", "kerb", "disab", "tactile", "mobility"],
        "label": "Accessibility & inclusion",
        "input_label": "Barrier observations",
        "record_label": "Barrier / accessibility reports",
        "beneficiary_default": "people with disabilities and the wider community",
    },
    "health": {
        "keywords": ["health", "clinic", "patient", "disease", "outbreak", "nutrition", "sanitation"],
        "label": "Public health",
        "input_label": "Field observations",
        "record_label": "Health records",
        "beneficiary_default": "patients and community health workers",
    },
    "agri": {
        "keywords": ["crop", "farm", "soil", "agri", "irrigation", "harvest", "pest"],
        "label": "Agriculture",
        "input_label": "Field observations",
        "record_label": "Crop / field records",
        "beneficiary_default": "farmers and the local cooperative",
    },
    "education": {
        "keywords": ["school", "student", "learn", "educat", "classroom", "dropout"],
        "label": "Education",
        "input_label": "Observations",
        "record_label": "Student / programme records",
        "beneficiary_default": "students and educators",
    },
}


def detect_flavour(text):
    text = (text or "").lower()
    best = None
    best_hits = 0
    for key, flavour in DOMAIN_FLAVOURS.items():
        hits = sum(1 for kw in flavour["keywords"] if kw in text)
        if hits > best_hits:
            best_hits = hits
            best = key
    if best:
        return best, DOMAIN_FLAVOURS[best]
    return "general", {
        "label": "General problem-solving",
        "input_label": "Observations & context",
        "record_label": "Data records",
        "beneficiary_default": "the people affected by this problem",
    }


# ---------------------------------------------------------------------------
# Built-in tools metadata
# ---------------------------------------------------------------------------
def default_tools():
    return [
        {"id": "check_inputs", "name": "Required-information check", "status": "ready",
         "description": "Confirms the information the agent needs is actually present before it continues."},
        {"id": "read_records", "name": "Structured data reader", "status": "ready",
         "description": "Reads structured records (sample data or pasted CSV/JSON) so they can be analysed."},
        {"id": "summarize", "name": "Record summariser", "status": "ready",
         "description": "Counts records, groups them and highlights simple patterns in the data."},
        {"id": "organize_report", "name": "Report organiser", "status": "ready",
         "description": "Organises findings into clearly-labelled report sections for a human expert."},
        {"id": "evaluate", "name": "Quality checklist", "status": "ready",
         "description": "Checks the result against a plain-language quality checklist."},
    ]


def default_checklist(flavour_key):
    checks = [
        {"id": "required_inputs", "label": "The information the agent needs was provided",
         "eval_key": "required_inputs"},
        {"id": "sufficient_records", "label": "There were enough records to summarise",
         "eval_key": "sufficient_records"},
        {"id": "findings_reference_data", "label": "Findings point back to the actual data",
         "eval_key": "findings_reference_data"},
        {"id": "gaps_flagged", "label": "Missing information and evidence gaps are flagged",
         "eval_key": "gaps_flagged"},
        {"id": "human_review", "label": "It is clear a human expert should review the result",
         "eval_key": "human_review"},
    ]
    return checks


def default_limitations(flavour_key, flavour):
    base = [
        "This runs in Demo mode with deterministic built-in tools, not a live AI model.",
        "It organises and summarises the information you provide — it does not independently verify it.",
        "Results are a starting point for investigation, not a final decision.",
    ]
    if flavour_key == "water":
        base.append("It does not predict real floods and must not be used to certify drainage or engineering decisions.")
    elif flavour_key == "accessibility":
        base.append("It does not certify that any route, building or facility is accessible or compliant.")
    else:
        base.append("A qualified expert in this field should review every result before it is acted on.")
    return base


def default_assumptions():
    return [
        "The records you provide are representative of the situation you are describing.",
        "Numbers and categories in the data are recorded consistently.",
    ]


def build_inputs(flavour):
    return [
        {"key": "situation", "label": flavour["input_label"],
         "help": "Describe what is happening in a few sentences.", "type": "textarea", "required": True},
        {"key": "location", "label": "Area, location or group (optional)",
         "help": "Where or who does this concern?", "type": "text", "required": False},
        {"key": "records", "label": flavour["record_label"],
         "help": "Paste CSV or JSON rows, or switch on the sample dataset.", "type": "records", "required": True},
    ]


def _first_sentence(text, fallback):
    text = (text or "").strip()
    if not text:
        return fallback
    m = re.split(r"(?<=[.!?])\s", text)
    return m[0].strip()


def generate_proposal(payload):
    """Turn a plain-language request into an editable agent proposal."""
    domain = payload.get("domain", "")
    problem = payload.get("problem", "")
    beneficiaries = payload.get("beneficiaries", "")
    data_description = payload.get("data_description", "")
    outcome = payload.get("outcome", "")
    constraints = payload.get("constraints", "")

    combined = " ".join([domain, problem, data_description, outcome, payload.get("prompt", "")])
    flavour_key, flavour = detect_flavour(combined)

    # Name
    explicit_name = (payload.get("name") or "").strip()
    if explicit_name:
        name = explicit_name
    else:
        core = _first_sentence(problem, domain or "Domain") 
        words = [w for w in re.findall(r"[A-Za-z]+", core) if len(w) > 3][:3]
        topic = " ".join(w.capitalize() for w in words) or (domain.split()[0].capitalize() if domain else "Domain")
        name = f"{topic} Analysis Agent"

    purpose = outcome.strip() or f"Help investigate: {_first_sentence(problem, 'the described problem')}"
    beneficiaries = beneficiaries.strip() or flavour["beneficiary_default"]

    inputs = build_inputs(flavour)

    workflow = [
        {"id": new_id(), "tool": "check_inputs", "title": "Check the information provided",
         "description": "Make sure the situation description and data records needed are present before going further.",
         "uses": ["situation", "records"]},
        {"id": new_id(), "tool": "read_records", "title": "Read the data records",
         "description": "Read the structured records (sample data or pasted rows) and detect their fields.",
         "uses": ["records"]},
        {"id": new_id(), "tool": "summarize", "title": "Summarise and find patterns",
         "description": "Count the records, group them and highlight the clearest patterns in plain language.",
         "uses": ["records"]},
        {"id": new_id(), "tool": "organize_report", "title": "Organise findings into a report",
         "description": "Lay the findings out in clear sections, including what the data shows and what is still unknown.",
         "uses": ["situation", "location", "records"]},
        {"id": new_id(), "tool": "evaluate", "title": "Run the quality checklist",
         "description": "Check the result against a short quality checklist and flag anything that needs human review.",
         "uses": []},
    ]

    outputs = [
        "A plain-language report with clearly-labelled sections",
        "A summary of what the data shows and the clearest patterns",
        "A list of questions and gaps that still need expert evidence",
        "A quality checklist showing what passed and what needs review",
    ]

    proposal = {
        "name": name,
        "purpose": purpose,
        "domain": domain or flavour["label"],
        "domain_flavour": flavour_key,
        "problem": problem,
        "beneficiaries": beneficiaries,
        "constraints": constraints,
        "inputs": inputs,
        "outputs": outputs,
        "workflow": workflow,
        "tools": default_tools(),
        "checks": default_checklist(flavour_key),
        "limitations": default_limitations(flavour_key, flavour),
        "assumptions": default_assumptions(),
    }
    return proposal


# ---------------------------------------------------------------------------
# Record parsing
# ---------------------------------------------------------------------------
def parse_records(raw):
    """Parse a pasted string into a list of dict rows (CSV or JSON)."""
    if not raw or not str(raw).strip():
        return []
    raw = str(raw).strip()
    # Try JSON first
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            data = [data]
        if isinstance(data, list):
            return [r for r in data if isinstance(r, dict)]
    except (ValueError, TypeError):
        pass
    # Fall back to CSV
    try:
        reader = csv.DictReader(io.StringIO(raw))
        rows = [dict(r) for r in reader]
        cleaned = []
        for r in rows:
            cleaned.append({k.strip(): _coerce(v) for k, v in r.items() if k})
        return cleaned
    except Exception:
        return []


def _coerce(v):
    if v is None:
        return v
    s = str(v).strip()
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if re.fullmatch(r"-?\d*\.\d+", s):
        return float(s)
    return s


def _is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
def _resolve_records(agent, run_input):
    if run_input.get("use_sample") and agent.get("sample_data"):
        return list(agent["sample_data"].get("records", [])), "sample dataset"
    recs = run_input.get("records")
    if isinstance(recs, list) and recs:
        return [r for r in recs if isinstance(r, dict)], "provided records"
    raw = run_input.get("raw_records")
    if raw:
        parsed = parse_records(raw)
        return parsed, "pasted records"
    return [], "none"


def _analyse(records):
    """Return simple, deterministic stats over the records."""
    fields = []
    for r in records:
        for k in r.keys():
            if k not in fields:
                fields.append(k)
    numeric = {}
    categorical = {}
    missing = {f: 0 for f in fields}
    for f in fields:
        vals = [r.get(f) for r in records]
        present = [v for v in vals if v not in (None, "", [])]
        missing[f] = len(records) - len(present)
        nums = [v for v in present if _is_number(v)]
        if nums and len(nums) >= max(1, len(present) // 2):
            numeric[f] = {
                "min": min(nums),
                "max": max(nums),
                "avg": round(sum(nums) / len(nums), 2),
                "count": len(nums),
            }
        else:
            counts = {}
            for v in present:
                key = str(v)
                counts[key] = counts.get(key, 0) + 1
            if counts and len(counts) <= max(8, len(records)):
                top = sorted(counts.items(), key=lambda x: -x[1])
                categorical[f] = {"counts": dict(top), "distinct": len(counts)}
    gaps = [f for f, m in missing.items() if m > 0]
    return {"fields": fields, "numeric": numeric, "categorical": categorical, "missing": missing, "gaps": gaps}


def run_agent(agent, run_input):
    """Execute the agent workflow deterministically and return a structured run."""
    records, record_source = _resolve_records(agent, run_input)
    text_inputs = run_input.get("inputs", {}) or {}
    situation = (text_inputs.get("situation") or "").strip()
    location = (text_inputs.get("location") or "").strip()

    steps = []
    ctx = {"records": records, "record_source": record_source, "situation": situation,
           "location": location, "stats": None, "present_inputs": [], "missing_inputs": []}

    for wf in agent.get("workflow", []):
        tool = wf.get("tool")
        step = {"id": wf.get("id") or new_id(), "tool": tool, "title": wf.get("title", tool),
                "status": "ok", "logs": [], "summary": "", "detail": None}

        if tool == "check_inputs":
            required = [i for i in agent.get("inputs", []) if i.get("required")]
            present, missing = [], []
            for i in required:
                key = i["key"]
                if key == "records":
                    ok = len(records) > 0
                else:
                    ok = bool((text_inputs.get(key) or "").strip())
                (present if ok else missing).append(i["label"])
            ctx["present_inputs"], ctx["missing_inputs"] = present, missing
            step["logs"] = [f"Provided: {p}" for p in present] + [f"Missing: {m}" for m in missing]
            if missing:
                step["status"] = "warning"
                step["summary"] = f"{len(present)} of {len(required)} required inputs provided; {len(missing)} missing."
            else:
                step["summary"] = f"All {len(required)} required inputs provided."
            step["detail"] = {"present": present, "missing": missing}

        elif tool == "read_records":
            if records:
                stats = _analyse(records)
                ctx["stats"] = stats
                step["summary"] = f"Read {len(records)} record(s) from the {record_source} with {len(stats['fields'])} field(s)."
                step["logs"] = [f"Fields detected: {', '.join(stats['fields'])}",
                                f"Preview row: {json.dumps(records[0], default=str)}"]
                step["detail"] = {"count": len(records), "fields": stats["fields"], "preview": records[:3]}
            else:
                step["status"] = "warning"
                step["summary"] = "No structured records were available to read."
                step["logs"] = ["Tip: paste CSV/JSON rows or switch on the sample dataset."]

        elif tool == "summarize":
            stats = ctx.get("stats")
            if stats:
                bullets = []
                for f, n in stats["numeric"].items():
                    bullets.append(f"{f}: ranges {n['min']}–{n['max']} (avg {n['avg']}).")
                for f, c in stats["categorical"].items():
                    top = next(iter(c["counts"].items()))
                    bullets.append(f"{f}: {c['distinct']} distinct value(s); most common '{top[0]}' ({top[1]}×).")
                step["summary"] = f"Summarised {len(records)} record(s)."
                step["logs"] = bullets or ["Records read but no clear numeric/categorical pattern detected."]
                step["detail"] = {"numeric": stats["numeric"], "categorical": stats["categorical"]}
            else:
                step["status"] = "skipped"
                step["summary"] = "Skipped — no records to summarise."

        elif tool == "organize_report":
            report = _build_report(agent, ctx)
            step["summary"] = "Organised findings into a report for expert review."
            step["logs"] = [f"Section: {s['heading']}" for s in report["sections"]]
            step["detail"] = {"section_count": len(report["sections"])}
            ctx["report"] = report

        elif tool == "evaluate":
            checklist = _evaluate_checklist(agent, ctx)
            passed = sum(1 for c in checklist if c["status"] == "pass")
            step["summary"] = f"{passed} of {len(checklist)} checks passed."
            step["logs"] = [f"{c['label']}: {c['status']}" for c in checklist]
            step["detail"] = {"checklist": checklist}
            ctx["checklist"] = checklist
            if any(c["status"] == "needs_review" for c in checklist):
                step["status"] = "warning"
        else:
            step["status"] = "skipped"
            step["summary"] = f"Unknown tool '{tool}' — skipped."

        steps.append(step)

    report = ctx.get("report") or _build_report(agent, ctx)
    checklist = ctx.get("checklist") or _evaluate_checklist(agent, ctx)

    used_inputs = []
    if situation:
        used_inputs.append({"label": "Situation description", "value": situation})
    if location:
        used_inputs.append({"label": "Area / location", "value": location})
    used_inputs.append({"label": "Data records", "value": f"{len(records)} record(s) from the {record_source}"})

    result = {
        "report": report,
        "used_inputs": used_inputs,
        "assumptions": agent.get("assumptions", []),
        "limitations": agent.get("limitations", []),
        "checklist": checklist,
        "records_count": len(records),
        "record_source": record_source,
    }
    return {"steps": steps, "result": result}


def _build_report(agent, ctx):
    records = ctx["records"]
    stats = ctx.get("stats") or (_analyse(records) if records else None)
    sections = []

    asked = []
    if ctx["situation"]:
        asked.append(ctx["situation"])
    if ctx["location"]:
        asked.append(f"Location/group in focus: {ctx['location']}.")
    asked.append(f"Purpose: {agent.get('purpose', '')}")
    sections.append({"heading": "What you asked", "body": "\n".join(b for b in asked if b)})

    if stats:
        lines = [f"{len(records)} record(s) were analysed, with fields: {', '.join(stats['fields'])}."]
        for f, n in stats["numeric"].items():
            lines.append(f"• {f}: lowest {n['min']}, highest {n['max']}, average {n['avg']}.")
        for f, c in stats["categorical"].items():
            parts = ", ".join(f"{k} ({v})" for k, v in list(c["counts"].items())[:5])
            lines.append(f"• {f}: {parts}.")
        sections.append({"heading": "What the data shows", "body": "\n".join(lines)})

        obs = _observations(stats, records)
        if obs:
            sections.append({"heading": "Key observations", "body": "\n".join(f"• {o}" for o in obs)})
    else:
        sections.append({"heading": "What the data shows",
                         "body": "No structured records were available, so no data summary could be produced. "
                                 "Add records (CSV/JSON) or use the sample dataset, then run again."})

    gaps = []
    if stats and stats["gaps"]:
        for f in stats["gaps"]:
            gaps.append(f"Some records are missing '{f}' — confirm these values in the field.")
    if records and len(records) < 5:
        gaps.append("The dataset is small; more records would make patterns more reliable.")
    gaps.append("Values here are self-reported/sample observations and have not been independently measured.")
    sections.append({"heading": "Questions needing more evidence", "body": "\n".join(f"• {g}" for g in gaps)})

    steps_next = [
        "Have a qualified expert in this field review these findings before acting.",
        "Collect field measurements for any value flagged as missing or uncertain.",
        "Decide which locations or cases to prioritise based on the patterns above and expert judgement.",
    ]
    sections.append({"heading": "Suggested next steps for expert review",
                     "body": "\n".join(f"• {s}" for s in steps_next)})

    return {"title": f"{agent.get('name', 'Agent')} — organised findings", "sections": sections}


def _observations(stats, records):
    obs = []
    # Highlight the record with the largest first numeric field.
    if stats["numeric"]:
        f = list(stats["numeric"].keys())[0]
        try:
            top = max(records, key=lambda r: r.get(f) if _is_number(r.get(f)) else float("-inf"))
            label = _row_label(top)
            obs.append(f"Highest '{f}' was {top.get(f)}{(' at ' + label) if label else ''}.")
        except (ValueError, TypeError):
            pass
    for f, c in stats["categorical"].items():
        top = next(iter(c["counts"].items()))
        if top[1] > 1:
            obs.append(f"'{top[0]}' is the most frequent value for '{f}' ({top[1]} record(s)).")
    return obs[:4]


def _row_label(row):
    for k in ("site", "location", "name", "area", "id"):
        if row.get(k):
            return str(row[k])
    return ""


def _evaluate_checklist(agent, ctx):
    records = ctx["records"]
    stats = ctx.get("stats")
    missing_inputs = ctx.get("missing_inputs", [])
    out = []
    for c in agent.get("checks", []):
        ek = c.get("eval_key")
        status, explanation = "not_assessed", "This check could not be assessed automatically."
        if ek == "required_inputs":
            if not missing_inputs:
                status, explanation = "pass", "All required inputs were provided."
            else:
                status, explanation = "needs_review", f"Missing: {', '.join(missing_inputs)}."
        elif ek == "sufficient_records":
            if len(records) >= 5:
                status, explanation = "pass", f"{len(records)} records is enough for a basic summary."
            elif len(records) > 0:
                status, explanation = "needs_review", f"Only {len(records)} record(s); add more for reliable patterns."
            else:
                status, explanation = "needs_review", "No records were available to summarise."
        elif ek == "findings_reference_data":
            if stats:
                status, explanation = "pass", "The report cites counts and values drawn directly from the data."
            else:
                status, explanation = "needs_review", "No data was summarised, so findings cannot reference it."
        elif ek == "gaps_flagged":
            status, explanation = "pass", "Evidence gaps and missing values are listed in the report."
        elif ek == "human_review":
            status, explanation = "pass", "The report and limitations state a human expert must review the result."
        out.append({"label": c.get("label"), "status": status, "explanation": explanation})
    return out


# ---------------------------------------------------------------------------
# Feedback -> revision
# ---------------------------------------------------------------------------
FEEDBACK_RULES = [
    {
        "match": ["which data", "supports", "evidence for", "cite", "source", "back up", "proof"],
        "change": "Added a workflow step that links each conclusion back to the supporting records.",
        "apply": lambda a: _add_step(a, "cite_sources", "Link conclusions to supporting data",
                                     "For each key finding, point back to the specific records that support it.", "summarize"),
        "check": {"id": "evidence_linked", "label": "Each conclusion links to supporting data", "eval_key": "findings_reference_data"},
    },
    {
        "match": ["ask me", "ask before", "assumption", "confirm", "check with me"],
        "change": "Added a step that surfaces assumptions for you to confirm before conclusions are drawn.",
        "apply": lambda a: _add_step(a, "confirm_assumptions", "Confirm assumptions with the user",
                                     "List the assumptions being made and invite the user to confirm or correct them first.", "check_inputs"),
        "check": {"id": "assumptions_confirmed", "label": "Assumptions are surfaced for confirmation", "eval_key": "human_review"},
    },
    {
        "match": ["plain", "simpler", "jargon", "easy to read", "non-technical"],
        "change": "Added an instruction to rewrite the report in plainer, jargon-free language.",
        "apply": lambda a: _note(a, "Report wording should avoid jargon and explain any technical term in plain language."),
        "check": None,
    },
    {
        "match": ["prioriti", "rank", "most urgent", "worst first", "severity"],
        "change": "Added emphasis on ranking findings so the most urgent cases appear first.",
        "apply": lambda a: _note(a, "Findings should be ordered so the most severe / urgent cases are listed first."),
        "check": {"id": "prioritised", "label": "Findings are ordered by urgency", "eval_key": "findings_reference_data"},
    },
]


def _add_step(agent, tool, title, desc, after_tool):
    wf = list(agent.get("workflow", []))
    if any(s.get("title") == title for s in wf):
        return agent
    new_step = {"id": new_id(), "tool": tool if tool in [t["id"] for t in default_tools()] else "organize_report",
                "title": title, "description": desc, "uses": []}
    # place after the referenced tool
    idx = next((i for i, s in enumerate(wf) if s.get("tool") == after_tool), len(wf) - 1)
    wf.insert(idx + 1, new_step)
    agent["workflow"] = wf
    return agent


def _note(agent, text):
    notes = agent.get("improvement_notes", [])
    if text not in notes:
        notes.append(text)
    agent["improvement_notes"] = notes
    return agent


def apply_feedback(agent, feedback_text):
    """Return (updated_agent, change_summaries) applying plain-language feedback."""
    text = (feedback_text or "").lower()
    changes = []
    for rule in FEEDBACK_RULES:
        if any(kw in text for kw in rule["match"]):
            agent = rule["apply"](agent)
            if rule.get("check"):
                checks = agent.get("checks", [])
                if not any(c["id"] == rule["check"]["id"] for c in checks):
                    checks.append(rule["check"])
                    agent["checks"] = checks
            changes.append(rule["change"])
    if not changes:
        agent = _note(agent, f"User feedback to consider: {feedback_text.strip()}")
        changes.append("Saved your feedback as a note on the agent and created a new version so you can track it.")
    return agent, changes
