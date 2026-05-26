#!/bin/bash
# Remove stale git lock files and push pending changes
cd "$(dirname "$0")"
rm -f .git/index.lock .git/HEAD.lock
git add styles.css
git commit -m "Move stats widget to bottom-right on all screen sizes"
git push origin main
echo "Done! Press any key to close."
read -n 1
