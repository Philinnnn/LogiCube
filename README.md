# LogiCube

Real-time collaborative logic circuit simulator. No sign-up, no passwords — pick a nickname, create or join a room, and build logic circuits together with someone on the other side of the world, live.

![status](https://img.shields.io/badge/status-active-brightgreen) ![stack](https://img.shields.io/badge/stack-React%20%2B%20ASP.NET%20Core%20SignalR-blue)

## What it does

Two (or more) people open the same room and get a shared canvas. Every drag, wire, and click is broadcast over WebSockets in real time — this is not "two players sharing one screen," it's genuinely remote, multi-room, multi-session collaboration.

- **No accounts.** Type a nickname, that's it. Duplicate names get auto-numbered ("John", "John 2", ...).
- **Rooms.** Create a public or password-protected room, or join by a 6-character code. Public rooms are listed live with player counts.
- **Logic gates.** AND, OR, NOT, XOR, NAND, NOR, plus an input switch, an output lamp, and a 4-bit decimal LED display.
- **Run mode.** Flip switches, watch the whole circuit evaluate live — wires light up as signal propagates. Start/Stop is synced for the whole room, not just your own browser.
- **Sequential circuits actually work.** The simulation engine does fixed-point iteration with memory between frames, so feedback loops (SR latches, etc.) settle to the correct state instead of just showing "unknown."
- **Truth table generator** — brute-forces every input combination for the current circuit.
- **Export / Import** — save a circuit as JSON (round-trips perfectly) or export the diagram as a PDF snapshot.
- **Editing tools you'd expect from a real app:** multi-select via Ctrl+drag, copy/cut/paste (Ctrl+C/X/V), Undo (Ctrl+Z, 10 steps), rename nodes by double-clicking, a minimap, a bounded canvas so you don't get lost.
- **In-room chat** with a live player list and join/leave log.
- **Dark/light theme**, and a **language switcher** (RU/EN) — translations are loaded from external JSON files at runtime, so adding a new language is just dropping in a new file, no rebuild required.

## Tech stack

| | |
|---|---|
| Frontend | React + TypeScript + Vite, [React Flow (`@xyflow/react`)](https://reactflow.dev) for the canvas |
| Realtime | ASP.NET Core + SignalR (WebSockets) |
| Backend state | In-memory (no database — rooms live for the process lifetime) |
| Circuit engine | Custom fixed-point boolean simulator (hand-written, no external logic library) |
| Export | `html-to-image` + `jsPDF` for PDF snapshots |

## Running locally

**Backend** (`server/`):
```bash
dotnet run
```
Runs on `http://localhost:5186` by default.

**Frontend** (`client/`):
```bash
npm install
npm install html-to-image jspdf
npm run dev
```
Runs on `http://localhost:5173` by default (Vite).

Open the frontend URL in two browser windows (or send the room code to a friend) to try the collaborative part.

## Project structure (frontend)

```
client/src/
├── App.tsx              # SignalR connection, room state, top-level orchestration
├── Lobby.tsx             # Nickname entry, room list, create/join screens
├── Canvas.tsx             # The circuit editor: toolbar, minimap, export/import, shortcuts
├── GateNode.tsx           # Renders every gate type (switch/lamp/LED display/logic gates)
├── Palette.tsx            # Drag-and-drop gate palette
├── gateLogic.ts            # Pure simulation engine (no React) — the actual "brain"
├── circuitTypes.ts          # Gate types and arities
├── useCircuitSimulation.ts   # Wires the engine into React state, run-mode overlay
├── TruthTable.tsx            # Truth table generator UI
├── ChatPanel.tsx              # In-room chat + player list
├── i18n.ts                     # Fetches and caches translations from /public/locales/*.json
└── public/locales/               # ru.json, en.json, index.json — the actual translation content
```
