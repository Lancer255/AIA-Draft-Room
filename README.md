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


## Version 3.4
- Moved Draft Radar / Decision Center label into the upper-right blue command bar.
- Removed the redundant right-panel header to create more vertical room.


## Version 3.6 Stable
- Restored the Version 3.4 Decision Center and Radar rendering.
- Added isolated Yes/No confirmation dialogs for Undo and Reset.
- Undo returns the player to Available Players and restores the wishlist entry when applicable.
- No changes were made to recommendation, radar, market-watch, or projected-return rendering.
