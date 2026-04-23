'use client'

import { useState, useEffect, useRef } from 'react'
import type { Task, DroneEvaluation } from '@/lib/types'

type Step = 'idle' | 'evaluated' | 'accepted' | 'executing' | 'ready'

interface Props {
  task: Task
  onEvaluate: () => Promise<DroneEvaluation>
  onAccept: () => Promise<void>
  onSubmitProof: (success: boolean) => Promise<void>
  isLoading: boolean
}

export default function DroneSimulator({
  task,
  onEvaluate,
  onAccept,
  onSubmitProof,
  isLoading,
}: Props) {
  const [evaluation, setEvaluation] = useState<DroneEvaluation | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (step === 'executing') {
      setProgress(0)
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setStep('ready')
            return 100
          }
          return prev + 2
        })
      }, 100)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [step])

  async function handleEvaluate() {
    const result = await onEvaluate()
    setEvaluation(result)
    setStep('evaluated')
  }

  async function handleAccept() {
    await onAccept()
    setStep('accepted')
    setStep('executing')
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
      {/* idle */}
      {step === 'idle' && (
        <div className="space-y-4">
          <div>
            <p className="text-gray-100 font-medium">{task.title}</p>
            <p className="text-cyan-400 text-sm mt-1">{task.reward} MON</p>
          </div>
          <button
            onClick={handleEvaluate}
            disabled={isLoading}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 text-gray-100 px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Evaluating...' : '🤖 Simulate Drone Evaluation'}
          </button>
        </div>
      )}

      {/* evaluated */}
      {step === 'evaluated' && evaluation && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Drone ID</p>
              <p className="text-gray-100 font-mono text-sm truncate">{evaluation.droneId}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Battery</p>
              <p className="text-gray-100 font-semibold">{evaluation.batteryLevel}%</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Distance</p>
              <p className="text-gray-100 font-semibold">{evaluation.distanceKm} km</p>
            </div>
          </div>

          {evaluation.canAccept ? (
            <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-3 space-y-3">
              <p className="text-green-400 text-sm">{evaluation.reason}</p>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                ✅ Accept Task
              </button>
            </div>
          ) : (
            <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3 space-y-3">
              <p className="text-red-400 text-sm">{evaluation.reason}</p>
              <button
                onClick={() => { setEvaluation(null); setStep('idle') }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                🔄 Try Another Drone
              </button>
            </div>
          )}
        </div>
      )}

      {/* executing */}
      {step === 'executing' && (
        <div className="space-y-3">
          <p className="text-gray-300 text-sm">Drone executing mission...</p>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-cyan-500 h-3 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs text-right">{progress}%</p>
        </div>
      )}

      {/* ready */}
      {step === 'ready' && (
        <div className="space-y-4">
          <p className="text-gray-100 text-sm">Mission complete. Submit proof:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSubmitProof(true)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              ✅ Simulate Success
            </button>
            <button
              onClick={() => onSubmitProof(false)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              ❌ Simulate Failure
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
