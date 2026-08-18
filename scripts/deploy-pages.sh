#!/usr/bin/env bash
# Build the static web app and publish it to the gh-pages branch (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."

export EXPO_PUBLIC_GOOGLE_CLIENT_ID="196234648247-sbmaderc4hua2klnslj6cmvh4dmpicib.apps.googleusercontent.com"
# NO leading slash — Git Bash would rewrite "/tony-fragrances-crm" into a
# Windows file path. app.config.ts adds the leading slash back. (Do NOT set
# MSYS_NO_PATHCONV here — it breaks the git worktree path below on Windows.)
export EXPO_PUBLIC_BASE_URL="tony-fragrances-crm"

echo "== exporting web build =="
rm -rf dist-web
# NativeWind cache race sometimes fails the first render pass; retry once.
npx expo export --platform web --output-dir dist-web \
  || npx expo export --platform web --output-dir dist-web

# GitHub Pages needs .nojekyll so the _expo/ folder is served (Jekyll strips _dirs).
touch dist-web/.nojekyll
# SPA safety net: unknown deep links fall back to the app shell.
cp dist-web/index.html dist-web/404.html

echo "== publishing to gh-pages =="
# Keep the worktree beside the repo (a Windows-native path) — a /tmp path can be
# mangled by Git on Windows and orphan a worktree that then locks the branch.
WT="$(pwd)/../_ghp_tony"
git worktree remove --force "$WT" 2>/dev/null || true
git worktree prune
git worktree add --force -B gh-pages "$WT"
# clear old contents, copy fresh build
find "$WT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r dist-web/. "$WT"/
cd "$WT"
git add -A
git -c user.name="Prathap-Alpha" -c user.email="prathap.bb@gmail.com" commit -qm "Deploy web build to GitHub Pages" || echo "(no changes)"
git push -f -q origin gh-pages
cd - >/dev/null
git worktree remove --force "$WT" 2>/dev/null || true
echo "== done =="
