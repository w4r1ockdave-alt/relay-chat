# Relay — MIDI to Melody VST Studio

A full-stack web app that turns MIDI sketches into singable melodies using a scale-aware VST-style engine (MelodyForge Pro), with a plugin catalog, projects library and presets.

## Stack
- **Frontend:** React + Vite (dark studio UI, sidebar dashboard, piano-roll visualization, WebAudio playback)
- **Backend:** Express + JWT auth + bcrypt + `@tonejs/midi` (real `.mid` parse/export)
- **Storage:** Persistent JSON store (`server/data/db.json`) — users, projects, presets, plugins

## Run locally
```bash
npm install
npm --prefix client install
node server/seed.js        # seeds demo data (idempotent)
npm run dev                # API :3001 + client :5173 (proxied)
```

## Demo account
- Email: `demo@relay.studio`
- Password: `demo1234`

## Features
- **Auth:** register / login / JWT-protected API, demo account pre-seeded
- **Studio:** drag-and-drop `.mid` upload, piano-roll compare (input vs melody), key/scale/tempo/harmony controls, quantize + humanize sliders, WebAudio playback, `.mid` export, save as project
- **Projects:** full CRUD (create/edit/delete), favorites (optimistic), draft/published status, filters, playback
- **Presets:** CRUD with optimistic updates, engine parameter sliders
- **VST Plugins:** catalog of 6 Relay Audio plugins, install/uninstall, live param tuning
- **Dashboard:** stats, recent projects, featured plugins
- **Polish:** empty states, loading skeletons, optimistic updates, responsive layout, seeded demo data (4 projects, 3 presets, 6 plugins)

## Windows desktop application

The Electron desktop shell runs the existing app locally, without requiring a separate server. On first launch it seeds the demo account; subsequent changes persist under `%APPDATA%\Relay` in `db.json`. A local API listens only on `127.0.0.1:31477`; the app will report an error if that port is already in use.

On Windows 10/11 x64, with Node.js 22 installed:

```powershell
npm ci
npm ci --prefix client
npm run desktop       # run locally
npm run dist:win      # create installer under release/
```

Alternatively, run the **Build Windows installer** GitHub Actions workflow and download the `Relay-Windows-installer` artifact. The installer is unsigned, so Windows SmartScreen may warn about it. Electron and electron-builder must be able to download their binaries when installing/building.

**Scope:** This is a standalone Windows application, not a VST3/AU plugin binary. The plugin catalog and its install controls are demo data; they do not install native plugins or integrate with a DAW. The MIDI generation, import, playback and export are provided by the app itself.
