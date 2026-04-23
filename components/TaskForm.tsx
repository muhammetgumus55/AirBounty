'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { TaskRequirements } from '@/lib/types'

interface Props {
  onGenerateRequirements: (title: string, desc: string) => Promise<void>
  onCreateTask: (title: string, desc: string, reward: string) => Promise<void>
  generatedRequirements: (TaskRequirements & { reasoning?: string }) | null
  isLoading: boolean
}

export default function TaskForm({
  onGenerateRequirements,
  onCreateTask,
  generatedRequirements,
  isLoading,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reward, setReward] = useState('0.05')

  const canGenerate = title.trim() !== '' && description.trim() !== '' && !isLoading

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
      {/* SECTION 1 — Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Task Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Survey agricultural field sector B-7"
            className="w-full bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Capture aerial footage of the northern crop area..."
            className="w-full bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Reward (MON)</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            min={0.001}
            step={0.001}
            className="w-full bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* SECTION 2 — Generate button */}
      <button
        onClick={() => onGenerateRequirements(title, description)}
        disabled={!canGenerate}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            AI is analyzing task...
          </>
        ) : (
          '✨ Generate AI Requirements'
        )}
      </button>

      {/* SECTION 3 — Requirements display */}
      {generatedRequirements && (
        <div className="border border-green-500/30 rounded-xl p-4 space-y-4">
          {/* Stat boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Coverage</p>
              <p className="text-green-400 font-semibold">
                ≥{generatedRequirements.minCoverage}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Duration</p>
              <p className="text-green-400 font-semibold">
                ≤{generatedRequirements.maxDurationMinutes} min
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Altitude</p>
              <p className="text-green-400 font-semibold">
                {generatedRequirements.altitudeRange.min}m–{generatedRequirements.altitudeRange.max}m
              </p>
            </div>
          </div>

          {/* Additional constraints */}
          {generatedRequirements.additionalConstraints.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {generatedRequirements.additionalConstraints.map((c, i) => (
                <span
                  key={i}
                  className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-2 py-1 rounded-full"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Reasoning */}
          {generatedRequirements.reasoning && (
            <p className="text-xs text-gray-400 italic">{generatedRequirements.reasoning}</p>
          )}

          {/* Create task button */}
          <button
            onClick={() => onCreateTask(title, description, reward)}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg transition-colors"
          >
            🚀 Create Task & Lock Reward
          </button>
        </div>
      )}
    </div>
  )
}
