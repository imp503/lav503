#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src-tauri/binaries"

mkdir -p "$OUT"

build() {
  local goos="$1"
  local goarch="$2"
  local triple="$3"
  local ext="$4"

  echo "Building Go sidecar for $triple"

  (
    cd "$ROOT/go-worker"

    CGO_ENABLED=0 \
      GOOS="$goos" \
      GOARCH="$goarch" \
      go build \
        -trimpath \
        -ldflags="-s -w" \
        -o "$OUT/go-worker-$triple$ext" \
        .
  )
}

case "${1:-linux}" in
  linux)
    build linux amd64 x86_64-unknown-linux-gnu ""
    ;;
  windows)
    build windows amd64 x86_64-pc-windows-msvc ".exe"
    ;;
  all)
    build linux amd64 x86_64-unknown-linux-gnu ""
    build windows amd64 x86_64-pc-windows-msvc ".exe"
    ;;
  *)
    echo "Usage: $0 [linux|windows|all]" >&2
    exit 2
    ;;
esac
