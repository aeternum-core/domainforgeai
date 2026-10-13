"""Static community demo templates and visibly-synthetic sample datasets.

Everything here is clearly labelled sample data for demonstration only.
It is NOT live measurement data and must not be treated as engineering,
medical, or accessibility certification advice.
"""

WATERLOGGING_RECORDS = [
    {"site": "Market Road junction", "date": "2024-07-03", "rainfall_mm": 86, "elevation_m": 12.4, "standing_water_cm": 34, "drain_status": "blocked", "clear_time_hr": 9},
    {"site": "Market Road junction", "date": "2024-07-18", "rainfall_mm": 54, "elevation_m": 12.4, "standing_water_cm": 21, "drain_status": "partially blocked", "clear_time_hr": 5},
    {"site": "Riverside Colony", "date": "2024-07-03", "rainfall_mm": 86, "elevation_m": 9.1, "standing_water_cm": 58, "drain_status": "blocked", "clear_time_hr": 14},
    {"site": "Riverside Colony", "date": "2024-08-11", "rainfall_mm": 102, "elevation_m": 9.1, "standing_water_cm": 71, "drain_status": "blocked", "clear_time_hr": 18},
    {"site": "School Lane", "date": "2024-07-18", "rainfall_mm": 54, "elevation_m": 15.7, "standing_water_cm": 8, "drain_status": "clear", "clear_time_hr": 1},
    {"site": "School Lane", "date": "2024-08-11", "rainfall_mm": 102, "elevation_m": 15.7, "standing_water_cm": 17, "drain_status": "partially blocked", "clear_time_hr": 3},
    {"site": "Bus Depot Gate", "date": "2024-08-11", "rainfall_mm": 102, "elevation_m": 10.2, "standing_water_cm": 44, "drain_status": "blocked", "clear_time_hr": 11},
    {"site": "Bus Depot Gate", "date": "2024-09-02", "rainfall_mm": 63, "elevation_m": 10.2, "standing_water_cm": 29, "drain_status": "partially blocked", "clear_time_hr": 6},
]

ACCESSIBILITY_RECORDS = [
    {"location": "Central Library entrance", "barrier_type": "step without ramp", "severity": "high", "surface": "smooth", "tactile_paving": "no", "notes": "Single 18cm step, no alternative route"},
    {"location": "City Park north path", "barrier_type": "uneven surface", "severity": "medium", "surface": "cracked", "tactile_paving": "no", "notes": "Tree-root heave along 20m stretch"},
    {"location": "Market Street crossing", "barrier_type": "missing curb ramp", "severity": "high", "surface": "smooth", "tactile_paving": "partial", "notes": "Curb ramp on one side only"},
    {"location": "Clinic Road sidewalk", "barrier_type": "obstruction", "severity": "medium", "surface": "smooth", "tactile_paving": "yes", "notes": "Parked scooters block 0.9m width"},
    {"location": "Community Hall ramp", "barrier_type": "steep gradient", "severity": "medium", "surface": "smooth", "tactile_paving": "yes", "notes": "Gradient appears steeper than comfortable; needs measurement"},
    {"location": "Bus Stop 14", "barrier_type": "no level boarding", "severity": "high", "surface": "smooth", "tactile_paving": "no", "notes": "Large gap between kerb and bus floor"},
]


TEMPLATES = [
    {
        "template_id": "urban-waterlogging",
        "name": "Urban Waterlogging Analysis Agent",
        "domain": "Civil engineering & municipal resilience",
        "tagline": "Organise rainfall, elevation and drainage notes into an expert-review report.",
        "problem": "Recurring waterlogging keeps affecting the same streets after heavy rain and we need to organise our scattered observations before planning any fix.",
        "beneficiaries": "Local residents and commuters affected by flooding, plus the city engineering team planning drainage work.",
        "data_description": "Rainfall records (mm), elevation / GIS notes (metres), drainage condition notes, and on-site observations of standing water after storms.",
        "outcome": "A clear, organised summary of where and when waterlogging is worst, which questions still need field evidence, and a report a civil engineer can review.",
        "constraints": "This is for investigation and prioritisation only. It must not predict real floods or certify engineering decisions. A qualified civil engineer must review all findings.",
        "example_prompt": "I'm a civil engineer looking at recurring waterlogging on four streets. I have rainfall records, elevation notes, drainage condition notes and site observations of standing water after storms. I want a clear summary of where flooding is worst, what the data suggests, and which gaps still need field checks — for expert review, not as a final engineering decision.",
        "sample_data": {
            "name": "Synthetic storm observation log",
            "description": "8 visibly synthetic site observations across 4 locations and 4 storm dates. Sample data only — not real measurements.",
            "records": WATERLOGGING_RECORDS,
        },
    },
    {
        "template_id": "accessibility-audit",
        "name": "Community Accessibility Audit Agent",
        "domain": "Urban accessibility & disability inclusion",
        "tagline": "Document barriers people meet in public spaces and organise them for follow-up.",
        "problem": "People with mobility and vision needs keep reporting obstacles on our streets and we need to organise those reports and work out what to check next.",
        "beneficiaries": "Residents with disabilities, older people, parents with strollers, and the community group or council that will act on the findings.",
        "data_description": "Observation reports of barriers in public spaces: location, barrier type, severity, surface condition, whether tactile paving exists, and short notes.",
        "outcome": "An organised list of reported barriers grouped by severity and type, with clear follow-up questions, as a starting point for a proper accessibility review.",
        "constraints": "This organises community reports only. It must NOT certify that any route, building or facility is accessible or compliant. A qualified accessibility assessor must verify on site.",
        "example_prompt": "Our community group collected reports of accessibility barriers on local streets — steps without ramps, uneven surfaces, missing curb ramps and obstructions. I want them organised by severity and type, with follow-up questions for each, so we can plan an on-site review. This should not claim any route is certified accessible.",
        "sample_data": {
            "name": "Synthetic barrier report log",
            "description": "6 visibly synthetic community accessibility reports. Sample data only — not a certified audit.",
            "records": ACCESSIBILITY_RECORDS,
        },
    },
]


def get_template(template_id):
    for t in TEMPLATES:
        if t["template_id"] == template_id:
            return t
    return None
