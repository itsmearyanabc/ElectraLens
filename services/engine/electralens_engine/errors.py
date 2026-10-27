"""Canonicalisation errors. Codes match packages/canon/src/errors.ts exactly."""


class CanonError(ValueError):
    """Names the field and a stable code, never the value, so reports can't leak personal data."""

    def __init__(self, code: str, field: str | None = None, row: int | None = None) -> None:
        self.code = code
        self.field = field
        self.row = row
        where = "" if field is None else f" at {field}"
        which = "" if row is None else f" (row {row})"
        super().__init__(f"{code}{where}{which}")

    def at_row(self, row: int) -> "CanonError":
        return CanonError(self.code, self.field, row)
