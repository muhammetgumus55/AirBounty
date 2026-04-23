# Zargo — Drone-Powered Last‑Mile Delivery (Demo)

Zargo is a Next.js demo app for last‑mile delivery using a drone fleet simulation + a Monad testnet smart contract workflow.

## What’s inside

- **Homepage**: live counters (active drones from fleet, deliveries today from saved proofs)
- **Register Drone**: add drones to the local fleet (stored in `localStorage`)
- **Request Delivery**: create a delivery task and lock payment on-chain
- **Task Detail**:
  - 4‑step **Drone Delivery Simulator**
  - **Accept Task** (demo-friendly)
  - **Submit & Pay** (demo-friendly; runs when Local check passes)

## Requirements

- Node.js 18+
- A wallet (MetaMask recommended)
- Monad testnet configured in the wallet

## Setup

Install dependencies:

```bash
cd dronechain
npm install
```

Create your local env file:

```bash
cp .env.local.example .env.local
```

Update these values in `.env.local`:

- **`NEXT_PUBLIC_CONTRACT_ADDRESS`**: deployed `DroneTask` contract address
- **`NEXT_PUBLIC_MONAD_RPC`**: Monad testnet RPC URL
- **`GEMINI_API_KEY`** (optional): for AI endpoints (not required if you removed AI UI)
- **`GEMINI_MODEL`** (optional): e.g. `gemini-2.5-flash`

## Run

```bash
cd dronechain
npm run dev
```

Open the app at `http://localhost:3000` (or `3001` if 3000 is busy).

## Demo flow (recommended)

1. **Register a drone**  
   Go to `"/drones/register"` and add a drone to your local fleet.

2. **Request a delivery**  
   Go to `"/create"`, fill in pickup/dropoff/reward/deadline and submit.

3. **Simulate delivery**  
   Open the created task (`/tasks/:id`), run the simulator steps until you see **“Package delivered”**.

4. **Submit & Pay**  
   If the simulator shows **“Local check: All criteria met”**, click **Submit & Pay**.

## Notes (demo vs on-chain)

The underlying contract enforces strict state rules (e.g. `OPEN -> ACCEPTED -> COMPLETED -> VERIFIED`).  
This demo includes a **demo-friendly fallback** in the UI for faster iteration:

- If local check passes, **Submit & Pay** may simulate acceptance/payment to keep the demo moving.
- For a fully strict on-chain flow, disable the demo simulation code paths in `app/tasks/[id]/page.tsx`.

## Project structure

- `app/` — Next.js App Router pages + API routes
- `components/` — UI components (simulator, verification panel, forms)
- `lib/` — contract wrappers, simulator logic, types

