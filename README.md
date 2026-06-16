# MemGUI-Agent Project Page

This repository hosts the GitHub Pages site for **MemGUI-Agent: An End-to-End
Long-Horizon Mobile GUI Agent with Proactive Context Management**.

## Local Preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Content

- `index.html` is the public project page.
- `css/agent.css` contains the MemGUI-Agent page styles.
- `images/results/` contains Figure 1 and leaderboard images.
- `images/brand/` contains project branding assets.
- The page embeds the nine public YouTube demo videos listed in
  `docs/memgui-youtube-videos.md` from the paper repository.

## Deployment

Configure GitHub Pages to serve this repository from the default branch. The
site is static and requires no build step.
