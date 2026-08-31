#!/usr/bin/env python3
from __future__ import annotations

import argparse
import pathlib

import cairosvg

TARGETS = (
    (1440, "desktop"),
    (1024, "desktop"),
    (768, "compact"),
    (430, "mobile"),
    (375, "mobile"),
)


def render(input_directory: pathlib.Path, output_directory: pathlib.Path) -> None:
    output_directory.mkdir(parents=True, exist_ok=True)
    for viewport, variant in TARGETS:
        for theme in ("light", "dark"):
            source = input_directory / f"profile-{variant}-{theme}.svg"
            if not source.is_file():
                raise FileNotFoundError(source)
            output = output_directory / f"{viewport}-{theme}.png"
            cairosvg.svg2png(
                bytestring=source.read_bytes(),
                write_to=str(output),
            )
            if not output.is_file() or output.stat().st_size == 0:
                raise RuntimeError(f"Preview was not generated: {output}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    arguments = parser.parse_args()
    render(arguments.input, arguments.output)


if __name__ == "__main__":
    main()
