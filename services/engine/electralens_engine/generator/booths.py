"""Synthetic polling stations: one per part, clearly marked DEMO, with no coordinates.

The district is real, but the facility and address are invented, so a scanned demo QR code
can never send anyone to a real building as if it were a polling station.
"""

from electralens_engine.generator.model import Rng
from electralens_engine.generator.population import Geography


def build_booths(rng: Rng, geo: Geography) -> list[dict]:
    rows = []
    for part in sorted(geo.parts, key=lambda p: p.code):
        if part.parent is None:
            raise ValueError(f"part {part.code} has no constituency")
        ac = geo.ac(part.parent)
        district = geo.district_of[ac.code]
        part_no = int(part.code.rsplit("-P", 1)[1])
        ward = (part_no - 1) // 4 + 1
        rows.append(
            {
                "station_code": f"{ac.code}-PS{part_no:03d}",
                "ac_code": ac.code,
                "parts_served": [part_no],
                "name": {
                    "en": f"DEMO Polling Station {part_no:03d} (fictional), {ac.name['en']}",
                    "hi": f"डेमो मतदान केंद्र {part_no:03d} (काल्पनिक), {ac.name['hi']}",
                },
                "address": {
                    "en": f"Fictional Ward {ward}, {district.name['en']} district (DEMO address)",
                    "hi": f"काल्पनिक वार्ड {ward}, {district.name['hi']} ज़िला (डेमो पता)",
                },
                # No coordinates: a fictional booth must never point at a real building.
                "lat": None,
                "lng": None,
                "accessibility": {
                    "ramp": rng.chance(0.75),
                    "ground_floor": rng.chance(0.85),
                    "drinking_water": rng.chance(0.9),
                    "toilet": rng.chance(0.8),
                    "wheelchair": rng.chance(0.5),
                },
                "source_url": None,
                "is_synthetic": True,
            }
        )
    return rows
