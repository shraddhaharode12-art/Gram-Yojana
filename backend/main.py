"""Gram Yojana helper service.

Endpoints
  POST /estimate/road           cost of a road from type, width, thickness, shoulders, length
  POST /roads/duplicate-check   does a new road run along an existing or planned one?
  POST /streetlights/illumination   (lux grid + best spacing)  -- used by the streetlight tool

All geometry arrives in local metres (x east, y north) so buffers and lengths are real distances.
The React app falls back to the same maths in the browser when this service is unreachable.

Run:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import math
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from shapely.geometry import LineString, Point

app = FastAPI(title="Gram Yojana API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------------------------------------------------------- rate card (mirror of src/lib/cost.ts)
RoadType = Literal["BT", "CC", "WBM", "Gravel"]
ROAD_RATES = {  # Rs per sq.m at the reference thickness (mm)
    "BT": (1050, 50),
    "CC": (1650, 150),
    "WBM": (720, 150),
    "Gravel": (340, 100),
}
SHOULDER_RATE = 220
CONTINGENCY = 0.05


class RoadEstimateIn(BaseModel):
    type: RoadType
    width: float = Field(gt=0, le=15)
    thickness: float = Field(gt=0, le=500)
    shoulder: float = Field(ge=0, le=5)
    length: float = Field(gt=0)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/estimate/road")
def estimate_road(r: RoadEstimateIn):
    rate, ref = ROAD_RATES[r.type]
    factor = 0.35 + 0.65 * (r.thickness / ref)
    carriage = round(rate * factor * r.width * r.length)
    shoulders = round(SHOULDER_RATE * r.shoulder * 2 * r.length)
    sub = carriage + shoulders
    cont = round(sub * CONTINGENCY)
    return {
        "area": r.width * r.length,
        "items": [
            {"label": f"{r.type} carriageway", "amount": carriage},
            {"label": "Shoulders (moorum)", "amount": shoulders},
            {"label": "Supervision & quality (5%)", "amount": cont},
        ],
        "total": sub + cont,
    }


# ---------------------------------------------------------------- duplicate detection
class Other(BaseModel):
    id: str
    pts: list[tuple[float, float]]
    width: float = 3.5


class DupIn(BaseModel):
    candidate: list[tuple[float, float]]
    width: float = 3.75
    others: list[Other] = []


@app.post("/roads/duplicate-check")
def duplicate_check(d: DupIn):
    """Buffer both lines to their half-widths (+1 m tolerance) and measure how much of the new
    centre-line lies inside the other road's buffer. A short shared junction is fine; running
    along an existing road for 40% or more of the length is a duplicate."""
    if len(d.candidate) < 2:
        return {"duplicate": False, "overlap": 0.0, "withId": None}
    line = LineString(d.candidate)
    best, best_id = 0.0, None
    for o in d.others:
        if len(o.pts) < 2:
            continue
        zone = LineString(o.pts).buffer(max(d.width, o.width) / 2 + 1.0)
        ratio = line.intersection(zone).length / line.length if line.length else 0.0
        if ratio > best:
            best, best_id = ratio, o.id
    return {"duplicate": best >= 0.4, "overlap": round(best, 3), "withId": best_id}


# ---------------------------------------------------------------- streetlight illumination
LAMPS = {  # lumens, pole height m, cost Rs, running Rs per night (11 h)
    "sodium": dict(lumens=16000, height=7.0, cost=9500, run=14.0),
    "led": dict(lumens=9000, height=7.0, cost=7500, run=5.5),
    "solar": dict(lumens=6000, height=6.0, cost=24000, run=0.0),
}


class LightIn(BaseModel):
    road: list[tuple[float, float]]
    lamp: Literal["sodium", "led", "solar"] = "led"
    spacing: float = Field(default=25, gt=3, le=80)
    road_width: float = 3.75
    target_lux: float = 5.0
    night: float = Field(default=1.0, ge=0, le=1, description="0 dusk .. 1 full night (dimmer sky -> lamps matter more)")


def _lux_at(pt: Point, lamps: list[Point], lamp: dict) -> float:
    # simple point-source model: lux = I * cos^3(theta) / h^2, I ~ lumens / (4*pi) * 0.35 efficiency boost
    intensity = lamp["lumens"] / (4 * math.pi) * 1.4
    total = 0.0
    for lp in lamps:
        d = pt.distance(lp)
        h = lamp["height"]
        cos_t = h / math.hypot(d, h)
        total += intensity * cos_t**3 / (h * h)
    return total


@app.post("/streetlights/illumination")
def illumination(q: LightIn):
    lamp = LAMPS[q.lamp]
    line = LineString(q.road)
    n = max(2, int(line.length // q.spacing) + 1)
    lamps = [line.interpolate(min(i * q.spacing, line.length)) for i in range(n)]
    samples = [line.interpolate(d) for d in range(0, int(line.length) + 1, 2)]
    lux = [_lux_at(s, lamps, lamp) for s in samples]
    lit = sum(1 for v in lux if v >= q.target_lux) / len(lux)

    # best spacing: widest spacing that still keeps >= 90% of the road above the target
    best = None
    for sp in range(10, 61, 2):
        pl = [line.interpolate(min(i * sp, line.length)) for i in range(max(2, int(line.length // sp) + 1))]
        ok = sum(1 for s in samples if _lux_at(s, pl, lamp) >= q.target_lux) / len(samples)
        if ok >= 0.9:
            best = sp
    count = n
    return {
        "lamps": [[p.x, p.y] for p in lamps],
        "lit_fraction": round(lit, 3),
        "min_lux": round(min(lux), 2),
        "avg_lux": round(sum(lux) / len(lux), 2),
        "best_spacing": best,
        "install_cost": count * lamp["cost"],
        "running_cost_per_year": round(count * lamp["run"] * 365),
        "lux_samples": [[s.x, s.y, round(v, 2)] for s, v in zip(samples, lux)],
    }
