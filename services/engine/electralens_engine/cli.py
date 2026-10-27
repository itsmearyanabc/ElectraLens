"""Command-line entry point (`el`). Subcommands are added stage by stage."""

import argparse
import sys
from pathlib import Path

from electralens_engine import __version__
from electralens_engine.paths import vectors_dir


def _cmd_vectors(args: argparse.Namespace) -> int:
    from electralens_engine.vectors import stale_vectors, write_vectors

    directory = Path(args.dir) if args.dir else vectors_dir()
    if args.write:
        for path in write_vectors(directory):
            print(f"wrote {path}")
        return 0
    stale = stale_vectors(directory)
    if stale:
        print(f"stale test vectors: {', '.join(stale)} (run `el vectors --write`)", file=sys.stderr)
        return 1
    print("test vectors are up to date")
    return 0


def _cmd_models(args: argparse.Namespace) -> int:
    from electralens_engine.codegen import stale_models, write_models

    if args.write:
        for path in write_models():
            print(f"wrote {path}")
        return 0
    stale = stale_models()
    if stale:
        print(f"stale models: {', '.join(stale)} (run `el models --write`)", file=sys.stderr)
        return 1
    print("models are up to date")
    return 0


def _cmd_generate(args: argparse.Namespace) -> int:
    from electralens_engine.generator import GeneratorConfig, generate

    config = GeneratorConfig(
        seed=args.seed,
        state=args.state,
        acs=args.acs,
        parts_min=args.parts_min,
        parts_max=args.parts_max,
        electors_min=args.electors_min,
        electors_max=args.electors_max,
    )
    summary = generate(config, Path(args.out))
    for line in summary:
        print(line)
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    import json
    import time

    from electralens_engine.analysis.benchmark import benchmark
    from electralens_engine.analysis.load import load_csv
    from electralens_engine.analysis.runner import run_audit, write_run

    salt = bytes.fromhex(args.salt_hex)
    started = time.perf_counter()
    baseline = load_csv(Path(args.baseline), salt)
    target = load_csv(Path(args.target), salt)
    loaded = time.perf_counter()
    areas = json.loads(Path(args.areas).read_text(encoding="utf-8"))["areas"]
    result = run_audit(baseline, target, areas, args.methodology)
    out = Path(args.out)
    write_run(result, out)
    finished = time.perf_counter()
    run = result.run
    print(f"run {run['run_id']} (methodology {run['methodology']}, engine {run['engine']})")
    print(
        f"  baseline {baseline.row_count} rows, target {target.row_count} rows, "
        f"{run['parts']} parts"
    )
    print(f"  findings: {run['findings_total']}  output hash {run['output_hash'][:16]}...")
    for rule, counts in run["findings_by_rule"].items():
        print(f"    {rule}: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    print(f"  load {loaded - started:.1f}s, analysis {finished - loaded:.1f}s -> {out}")
    if args.truth:
        truth = json.loads(Path(args.truth).read_text(encoding="utf-8"))["entries"]
        report = benchmark(result.findings, truth)
        (out / "benchmark.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
        )
        overall = report["overall"]
        print(f"  benchmark: precision {overall['precision']}, recall {overall['recall']}")
        for rule, r in report["per_rule"].items():
            extra = ""
            if r["false_positive_areas"]:
                extra += f"  FP {r['false_positive_areas']}"
            if r["missed_areas"]:
                extra += f"  missed {r['missed_areas']}"
            print(f"    {rule}: P {r['precision']} R {r['recall']}{extra}")
        if report["negative_control_violations"]:
            print(f"  negative controls violated: {report['negative_control_violations']}")
    return 0


def _cmd_ots(args: argparse.Namespace) -> int:
    from electralens_engine import ots

    path = Path(args.file)
    if args.action == "stamp":
        out = path.with_name(path.name + ".ots")
        out.write_bytes(ots.stamp(path.read_bytes()))
        print(f"wrote {out} (pending until Bitcoin confirms, usually a few hours)")
        return 0
    if args.action == "upgrade":
        upgraded, s = ots.upgrade(path.read_bytes())
        path.write_bytes(upgraded)
    else:
        s = ots.status(path.read_bytes())
    state = f"complete (Bitcoin block {s.bitcoin_heights[0]})" if s.complete else "pending"
    print(f"digest {s.digest}: {state}")
    return 0


def _cmd_seed_sql(args: argparse.Namespace) -> int:
    from electralens_engine.paths import repo_root
    from electralens_engine.seed import write_seed

    out = Path(args.out) if args.out else repo_root() / "supabase" / "seed.sql"
    print(f"wrote {write_seed(Path(args.areas), out)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="el",
        description="ElectraLens engine: synthetic data, canonicalisation, audits, worker.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    sub = parser.add_subparsers(dest="command")

    vectors = sub.add_parser("vectors", help="check or rewrite the shared canonicalisation vectors")
    vectors.add_argument("--write", action="store_true", help="rewrite the vector files")
    vectors.add_argument("--dir", help="vector directory (default: test-vectors/canon)")
    vectors.set_defaults(handler=_cmd_vectors)

    models = sub.add_parser("models", help="check or regenerate pydantic models from the schemas")
    models.add_argument("--write", action="store_true", help="rewrite the generated models")
    models.set_defaults(handler=_cmd_models)

    gen = sub.add_parser("generate", help="generate a synthetic roll, booths and ground truth")
    gen.add_argument("--seed", type=int, default=42)
    gen.add_argument(
        "--state",
        default="HR",
        choices=["HR", "RJ", "MP", "UP"],
        help="real state whose real districts frame the synthetic data (default: HR, Haryana)",
    )
    gen.add_argument("--acs", type=int, default=3, help="assembly constituencies (fictional)")
    gen.add_argument("--parts-min", type=int, default=36)
    gen.add_argument("--parts-max", type=int, default=48)
    gen.add_argument("--electors-min", type=int, default=600)
    gen.add_argument("--electors-max", type=int, default=1200)
    gen.add_argument("--out", default="data/demo", help="output directory")
    gen.set_defaults(handler=_cmd_generate)

    run = sub.add_parser("run", help="audit two roll versions (CSV) and write findings")
    run.add_argument("--baseline", required=True, help="earlier roll version (CSV)")
    run.add_argument("--target", required=True, help="later roll version (CSV)")
    run.add_argument("--areas", required=True, help="jurisdictions.json")
    run.add_argument("--methodology", default="2026.1")
    run.add_argument("--out", required=True, help="output directory")
    run.add_argument("--truth", help="ground_truth.json, to benchmark detection quality")
    run.add_argument(
        "--salt-hex",
        default="00" * 32,
        help="dataset salt for local runs (ingestion generates a random one per version)",
    )
    run.set_defaults(handler=_cmd_run)

    ots_cmd = sub.add_parser("ots", help="OpenTimestamps: stamp a file, upgrade or inspect a proof")
    ots_cmd.add_argument("action", choices=["stamp", "upgrade", "info"])
    ots_cmd.add_argument("file", help="file to stamp, or .ots proof to upgrade or inspect")
    ots_cmd.set_defaults(handler=_cmd_ots)

    seed = sub.add_parser("seed-sql", help="write supabase/seed.sql from a jurisdictions.json")
    seed.add_argument("--areas", required=True, help="jurisdictions.json from `el generate`")
    seed.add_argument("--out", help="output path (default: supabase/seed.sql)")
    seed.set_defaults(handler=_cmd_seed_sql)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    handler = getattr(args, "handler", None)
    if handler is None:
        parser.print_help()
        return 0
    return handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
