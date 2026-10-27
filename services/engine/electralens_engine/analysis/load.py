"""Loading roll versions in canonical form.

The audit always runs on canonical rows, the same bytes the dataset root commits to, so a
finding can be traced back to exactly the data that was anchored.
"""

import io
import uuid
from dataclasses import dataclass
from pathlib import Path

import polars as pl

from electralens_engine.canon import Commitment, dataset_commitment
from electralens_engine.csv_io import read_rows

ROLL_SCHEMA = {
    "record_key": pl.String,
    "ac_code": pl.String,
    "part_no": pl.Int32,
    "serial_no": pl.Int32,
    "name_local": pl.String,
    "name_latin": pl.String,
    "relative_name_local": pl.String,
    "relative_name_latin": pl.String,
    "relation_type": pl.String,
    "gender": pl.String,
    "age": pl.Int32,
    "house_no": pl.String,
    "epic_like": pl.String,
    "status": pl.String,
    "deletion_reason": pl.String,
    "qualifying_date": pl.String,
    "is_synthetic": pl.Boolean,
}


@dataclass(frozen=True)
class RollVersion:
    version_id: str
    root: str
    row_count: int
    qualifying_date: str
    is_synthetic: bool
    rows: pl.DataFrame

    def active(self) -> pl.DataFrame:
        return self.rows.filter(pl.col("status") == "active")


def local_version_id(root: str) -> str:
    """Stable UUID for a dataset that isn't in the database yet (local CLI runs)."""
    return str(uuid.UUID(bytes=bytes.fromhex(root)[:16], version=4))


def from_commitment(commitment: Commitment, version_id: str | None = None) -> RollVersion:
    data = b"\n".join(commitment.canonical_rows)
    rows = (
        pl.read_ndjson(io.BytesIO(data), schema=ROLL_SCHEMA)
        if data
        else pl.DataFrame(schema=ROLL_SCHEMA)
    )
    dates = rows["qualifying_date"].unique().to_list()
    if len(dates) != 1:
        raise ValueError("a roll version must have exactly one qualifying date")
    return RollVersion(
        version_id=version_id or local_version_id(commitment.root),
        root=commitment.root,
        row_count=commitment.row_count,
        qualifying_date=dates[0],
        is_synthetic=bool(rows["is_synthetic"].all()),
        rows=rows,
    )


def load_csv(path: Path, salt: bytes) -> RollVersion:
    """Canonicalise a CSV roll and load it. Raises CanonError on invalid data."""
    return from_commitment(dataset_commitment(read_rows(path), "electoral_roll_v1", salt))
