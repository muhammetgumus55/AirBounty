"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_FLEET, getFleet } from "@/lib/droneSimulator";
import type { DroneSpec } from "@/lib/types";

const FLEET_STORAGE_KEY = "dronechain_fleet";

type DroneFormState = {
  id: string;
  name: string;
  maxPayloadKg: string;
  maxRangeKm: string;
  maxFlightMinutes: string;
  homeLocation: string;
  ownerAddress: string;
  batteryLevel: string;
  totalDeliveries: string;
  successRate: string;
  earnedTotal: string;
  hasCoolingBay: boolean;
  hasSecureCompartment: boolean;
  status: DroneSpec["status"];
};

const EMPTY_FORM: DroneFormState = {
  id: "",
  name: "",
  maxPayloadKg: "2",
  maxRangeKm: "10",
  maxFlightMinutes: "40",
  homeLocation: "",
  ownerAddress: "",
  batteryLevel: "100",
  totalDeliveries: "0",
  successRate: "95",
  earnedTotal: "0",
  hasCoolingBay: false,
  hasSecureCompartment: false,
  status: "AVAILABLE",
};

function generateDroneId(): string {
  return `DRONE-ZRG-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function RegisterDronePage() {
  const [fleet, setFleet] = useState<DroneSpec[]>([]);
  const [form, setForm] = useState<DroneFormState>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setFleet(getFleet());
  }, []);

  const fleetCount = useMemo(() => fleet.length, [fleet]);

  function setField<K extends keyof DroneFormState>(key: K, value: DroneFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function saveFleet(nextFleet: DroneSpec[]) {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(nextFleet));
    setFleet(nextFleet);
  }

  function handleResetFleet() {
    saveFleet(DEMO_FLEET);
    setMessage({ type: "success", text: "Demo fleet restored." });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const droneId = (form.id.trim() || generateDroneId()).toUpperCase();
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Drone name is required." });
      return;
    }
    if (!form.homeLocation.trim()) {
      setMessage({ type: "error", text: "Home location is required." });
      return;
    }
    if (!form.ownerAddress.trim()) {
      setMessage({ type: "error", text: "Owner wallet address is required." });
      return;
    }
    if (fleet.some((drone) => drone.id.toUpperCase() === droneId)) {
      setMessage({ type: "error", text: "Drone ID already exists. Choose another one." });
      return;
    }

    const maxPayloadKg = Number(form.maxPayloadKg);
    const maxRangeKm = Number(form.maxRangeKm);
    const maxFlightMinutes = Number(form.maxFlightMinutes);
    const batteryLevel = Number(form.batteryLevel);
    const totalDeliveries = Number(form.totalDeliveries);
    const successRate = Number(form.successRate);
    const earnedTotal = Number(form.earnedTotal);

    if (
      [maxPayloadKg, maxRangeKm, maxFlightMinutes, batteryLevel, totalDeliveries, successRate, earnedTotal].some(
        (n) => Number.isNaN(n)
      )
    ) {
      setMessage({ type: "error", text: "Please enter valid numeric values." });
      return;
    }

    const newDrone: DroneSpec = {
      id: droneId,
      name: form.name.trim(),
      maxPayloadKg,
      maxRangeKm,
      maxFlightMinutes,
      hasCoolingBay: form.hasCoolingBay,
      hasSecureCompartment: form.hasSecureCompartment,
      homeLocation: form.homeLocation.trim(),
      ownerAddress: form.ownerAddress.trim(),
      batteryLevel: Math.max(0, Math.min(100, Math.round(batteryLevel))),
      status: form.status,
      totalDeliveries: Math.max(0, Math.round(totalDeliveries)),
      successRate: Math.max(0, Math.min(100, Number(successRate.toFixed(1)))),
      earnedTotal: earnedTotal.toFixed(1),
    };

    const nextFleet = [newDrone, ...fleet];
    saveFleet(nextFleet);
    setForm(EMPTY_FORM);
    setMessage({ type: "success", text: `${newDrone.name} added to fleet.` });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Register Drone</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add a new drone and define its delivery capabilities.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Drone Specs</h2>

          {message && (
            <div
              className={`text-sm rounded-lg px-3 py-2 border ${
                message.type === "success"
                  ? "text-green-300 bg-green-500/10 border-green-500/25"
                  : "text-red-300 bg-red-500/10 border-red-500/25"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm text-slate-300">
              Drone ID (optional)
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="DRONE-ZRG-1001"
                value={form.id}
                onChange={(e) => setField("id", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Name *
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Zargo Falcon"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Home Location *
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Kadikoy Hub"
                value={form.homeLocation}
                onChange={(e) => setField("homeLocation", e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Owner Wallet *
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="0x..."
                value={form.ownerAddress}
                onChange={(e) => setField("ownerAddress", e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Max Payload (kg)
              <input
                type="number"
                min={0}
                step="0.1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.maxPayloadKg}
                onChange={(e) => setField("maxPayloadKg", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Max Range (km)
              <input
                type="number"
                min={0}
                step="0.1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.maxRangeKm}
                onChange={(e) => setField("maxRangeKm", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Max Flight (minutes)
              <input
                type="number"
                min={1}
                step="1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.maxFlightMinutes}
                onChange={(e) => setField("maxFlightMinutes", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Battery (%)
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.batteryLevel}
                onChange={(e) => setField("batteryLevel", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Total Deliveries
              <input
                type="number"
                min={0}
                step="1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.totalDeliveries}
                onChange={(e) => setField("totalDeliveries", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Success Rate (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.successRate}
                onChange={(e) => setField("successRate", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Earned Total (MON)
              <input
                type="number"
                min={0}
                step="0.1"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.earnedTotal}
                onChange={(e) => setField("earnedTotal", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Status
              <select
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                value={form.status}
                onChange={(e) => setField("status", e.target.value as DroneSpec["status"])}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="IN_MISSION">IN_MISSION</option>
                <option value="CHARGING">CHARGING</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.hasCoolingBay}
                onChange={(e) => setField("hasCoolingBay", e.target.checked)}
              />
              Cooling Bay
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.hasSecureCompartment}
                onChange={(e) => setField("hasSecureCompartment", e.target.checked)}
              />
              Secure Compartment
            </label>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Add Drone
            </button>
            <button
              type="button"
              onClick={handleResetFleet}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Restore Demo Fleet
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Current Fleet</h2>
            <span className="text-xs text-slate-400">{fleetCount} drones</span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
            {fleet.map((drone) => (
              <div key={drone.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{drone.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                    {drone.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{drone.id}</p>
                <p className="text-xs text-slate-400 mt-1">{drone.homeLocation}</p>
                <div className="mt-2 text-xs text-slate-300 grid grid-cols-2 gap-y-1">
                  <span>Payload: {drone.maxPayloadKg}kg</span>
                  <span>Range: {drone.maxRangeKm}km</span>
                  <span>Flight: {drone.maxFlightMinutes}m</span>
                  <span>Battery: {drone.batteryLevel}%</span>
                </div>
              </div>
            ))}
            {fleet.length === 0 && (
              <p className="text-sm text-slate-500">No drones yet. Add your first drone.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
