from pathlib import Path

from electralens_engine.worker.config import read_env_file, with_env_file


def test_values_are_taken_literally_like_node(tmp_path: Path) -> None:
    env = tmp_path / "app.env"
    env.write_text(
        "# settings\n"
        "\n"
        "DATABASE_URL=postgresql://postgres.ref:Example1@pooler.example.com:5432/postgres\n"
        "ADMIN_PASSWORD=Example@Pass!\n"
        "SALT=a$b=c\n"
        "QUOTED='kept as is'\n"
        "# DISABLED=1\n"
        "not a setting\n",
        encoding="utf-8",
    )
    assert read_env_file(env) == {
        "DATABASE_URL": "postgresql://postgres.ref:Example1@pooler.example.com:5432/postgres",
        "ADMIN_PASSWORD": "Example@Pass!",
        "SALT": "a$b=c",
        "QUOTED": "kept as is",
    }


def test_environment_wins_over_the_file(tmp_path: Path) -> None:
    env = tmp_path / "app.env"
    env.write_text("WORKER_ID=from-file\nPOLL_INTERVAL_MS=3000\n", encoding="utf-8")
    merged = with_env_file({"ELECTRALENS_ENV_FILE": str(env), "WORKER_ID": "from-env"})
    assert merged["WORKER_ID"] == "from-env"
    assert merged["POLL_INTERVAL_MS"] == "3000"
