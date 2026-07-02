#!/bin/bash
set -e
cd "$(dirname "$0")"
git add -A
git status --short
git commit -F commit-msg.txt
rm -f commit-msg.txt do-commit.sh
echo "COMMIT_OK"
git log -1 --oneline
