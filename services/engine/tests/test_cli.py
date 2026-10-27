import pytest

from electralens_engine import __version__
from electralens_engine.cli import main


def test_help_runs_without_arguments(capsys: pytest.CaptureFixture[str]) -> None:
    assert main([]) == 0
    assert "ElectraLens engine" in capsys.readouterr().out


def test_version_flag(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main(["--version"])
    assert exit_info.value.code == 0
    assert __version__ in capsys.readouterr().out
