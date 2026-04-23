# Zargo — Drone-Powered Last‑Mile Delivery (Demo)

Zargo is a Next.js demo app for last‑mile delivery using a drone fleet simulation + a Monad testnet smart contract workflow.

## High-level idea

Zargo has two parallel “worlds”:

- **Local simulation world**: a drone fleet and delivery telemetry are generated in the browser (fast UX, demo-friendly).
- **On-chain world (Monad testnet)**: tasks can be created/accepted/submitted/verified via the `DroneTask` contract.

The UI is optimized for demo iteration, so some flows include **simulated shortcuts** when configured.

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

## Commands

```bash
npm run dev      # start Next dev server
npm run build    # production build
npm run start    # run production server
npm run lint     # lint
```

## Run

```bash
cd dronechain
npm run dev
```

Open the app at `http://localhost:3000` (or `3001` if 3000 is busy).

## Key pages

- `/` — homepage (live counters + demo deliveries)
- `/create` — request a delivery (locks payment via `createTask`)
- `/drones/register` — add drones to the local fleet (localStorage)
- `/tasks/:id` — task details + simulator + submit/pay demo flow

## Demo flow (recommended)

1. **Register a drone**  
   Go to `"/drones/register"` and add a drone to your local fleet.

2. **Request a delivery**  
   Go to `"/create"`, fill in pickup/dropoff/reward/deadline and submit.

3. **Simulate delivery**  
   Open the created task (`/tasks/:id`), run the simulator steps until you see **“Package delivered”**.

4. **Submit & Pay**  
   If the simulator shows **“Local check: All criteria met”**, click **Submit & Pay**.

## Smart contract workflow (strict)

Contract: `contracts/DroneTask.sol`

Strict on-chain state machine:

1. `createTask(...)` (payable) → status `OPEN`
2. `acceptTask(taskId)` → status `ACCEPTED` (must be a different wallet than creator)
3. `submitProof(taskId, proofHash)` → status `COMPLETED` (only assigned drone wallet)
4. `verifyAndPay(taskId, approved)` → status `VERIFIED` or `FAILED` (**owner-only**)

## Demo shortcuts

Some UI actions may simulate acceptance/payment **for demo purposes** (to keep the flow moving without requiring multiple wallets / owner role):

- `Accept Task` may mark the task as accepted locally if the wallet is the creator.
- `Submit & Pay` may simulate a payment receipt if strict on-chain requirements are not met but the local check passes.

To remove demo shortcuts, update `app/tasks/[id]/page.tsx` and enforce the strict contract checks only.

## Local storage keys

- `dronechain_fleet` — persisted drone fleet (array of `DroneSpec`)
- `proof_<taskId>` — latest delivery proof object for a task

## Where core logic lives

- `lib/contract.ts` — ethers v6 contract wrapper (create/accept/submit/verify)
- `lib/droneSimulator.ts` — fleet evaluation + telemetry checkpoint simulation
- `components/DroneSimulator.tsx` — 4-step simulator UI + submit/pay button
- `components/TaskForm.tsx` — delivery request form
- `components/VerificationPanel.tsx` — local criteria display (AI section removed)

## Notes (demo vs on-chain)

The underlying contract enforces strict state rules (e.g. `OPEN -> ACCEPTED -> COMPLETED -> VERIFIED`).  
This demo includes a **demo-friendly fallback** in the UI for faster iteration:

- If local check passes, **Submit & Pay** may simulate acceptance/payment to keep the demo moving.
- For a fully strict on-chain flow, disable the demo simulation code paths in `app/tasks/[id]/page.tsx`.

## Project structure

- `app/` — Next.js App Router pages + API routes
- `components/` — UI components (simulator, verification panel, forms)
- `lib/` — contract wrappers, simulator logic, types

