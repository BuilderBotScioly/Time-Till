# Time-Till

Time-Till is a lightweight static website for tracking multiple named countdowns while skipping any days you do not want counted.

## What it does

- Create as many countdowns as you want
- Give each countdown its own name and target date
- Exclude recurring weekdays like Saturdays and Sundays
- Exclude one-off specific dates like holidays or travel days
- Edit or delete countdowns later
- Save everything in the browser with `localStorage`

## How the counting works

Each countdown starts from today and counts included days up to the target date.

- If the target date is tomorrow, that is `1` calendar day away
- Excluded weekdays are skipped every week
- Excluded specific dates are skipped once
- The dashboard shows both:
  - included days remaining
  - raw calendar days remaining

## Files

- `index.html` - page structure
- `styles.css` - layout and visual design
- `script.js` - countdown logic, rendering, and local persistence

## Running it

Because this is a static site, you can open `index.html` directly in a browser or publish the repository with GitHub Pages.

## GitHub Pages

This repo is ready for GitHub Pages as-is.

1. Open the repository settings on GitHub.
2. Turn on GitHub Pages.
3. Set the source to deploy from the `main` branch root.

## Notes

- Saved countdowns stay in the browser on the device where you created them.
- If you want syncing across devices later, the next step would be adding a backend or a database-backed auth flow.
