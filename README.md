# AIA Draft Room 3.1

GitHub Pages-ready version of the Always In Action fantasy football draft room.

## Included

- Snake draft grid with fixed team columns
- Sticky team headers
- Wrapped player names
- Gold pick numbers for keeper-eligible Rounds 10–17
- Gold outline for MJIJX selections
- Smaller Available Players panel and expanded board
- Clickable team rosters with starter and empty-slot views
- Private wishlist with instant hide/show and local saving
- Radar / Decision Center foundation
- 2026 player data separated from the interface

## Publish on GitHub Pages

1. Unzip this package.
2. In the `AIA-Draft-Room` GitHub repository, choose **Add file → Upload files**.
3. Upload the **contents inside this folder** so `index.html`, `css`, `js`, and `data` appear at the repository root.
4. Commit the files to `main`.
5. Open **Settings → Pages**.
6. Choose **Deploy from a branch**, `main`, and `/(root)`, then Save.
7. The site will appear at `https://lancer255.github.io/AIA-Draft-Room/`.

## Data files

- `data/settings.json` — league format and draft date
- `data/owners.json` — teams/owners
- `data/players.json` — current player pool and ADP
- `data/draft.json` — 17-round snake draft order

Draft state and wishlist are saved in the browser using localStorage.

## Version 3.1
- Drafted players are automatically removed from My Wishlist.
- Undo restores a player to the wishlist when the player was on it before being drafted.


## Version 3.2
- Fixed wishlist heart buttons for player names containing apostrophes or special characters.
- Wishlist additions now use safe player indexes and normalized name matching.
- Drafted players cannot be re-added to the wishlist.


## Version 3.3
- Wishlist search now autocompletes from the current Available Players pool.
- Suggestions update while typing and exclude drafted players automatically.
- Selecting a suggestion adds the exact matching player.


## Version 3.7 — Decision Center Rollback
- Restored the last stable Version 3.3 Decision Center and Radar layout.
- Restored the original right-panel header and positioning.
- Removed the later blue-header relocation.
- Removed the later custom Undo/Reset confirmation changes.
- Preserved wishlist autocomplete.
- Preserved automatic wishlist removal when a player is drafted.
- Preserved safe heart-button player references.


## Version 3.8 — MJIJX Needs
- Added spacing below the wishlist so the MJIJX Needs card starts lower.
- Added a full-width Bench tile showing 0/8 through 8/8.
- Added Roster X/17 and Picks Remaining.
- Need tiles now show empty (white), partial (gold), or filled (green).
- No changes to the Decision Center, Radar logic, wishlist, draft board, or player data.
