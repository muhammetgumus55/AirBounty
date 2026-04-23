'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { VerificationResult } from '@/lib/types'

interface CriteriaCheck {
  criterion: string
  required: string
  actual: string
  passed: boolean
}

interface VerificationResultExtended extends VerificationResult {
  criteriaChecks?: CriteriaCheck[]
  confidenceScore?: number
}

interface Props {
  result: VerificationResultExtended
  onProcessPayment: () => Promise<void>
  isLoading: boolean
}

export default function VerificationPanel({ result, onProcessPayment, isLoading }: Props) {
  const [visible, setVisible] = useState(false)
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    // Trigger fade-in on mount
    const fadeTimer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(fadeTimer)
  }, [])

  useEffect(() => {
    // Animate confidence bar after component becomes visible
    if (visible && result.confidenceScore != null) {
      const barTimer = setTimeout(() => setBarWidth(result.confidenceScore!), 50)
      return () => clearTimeout(barTimer)
    }
  }, [visible, result.confidenceScore])

  return (
    <div
      className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* HEADER */}
      <div className="text-center">
        {result.approved ? (
          <h2 className="text-3xl font-bold text-green-400">✅ MISSION VERIFIED</h2>
        ) : (
          <h2 className="text-3xl font-bold text-red-400">❌ MISSION FAILED</h2>
        )}
      </div>

      {/* AI REASONING */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">AI Verification Report</p>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm italic">{result.reasoning}</p>
        </div>
      </div>

      {/* CRITERIA TABLE */}
      {result.criteriaChecks && result.criteriaChecks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2">Criterion</th>
                <th className="text-left px-4 py-2">Required</th>
                <th className="text-left px-4 py-2">Actual</th>
                <th className="text-center px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.criteriaChecks.map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? 'bg-gray-800/50' : 'bg-transparent'}
                >
                  <td className="px-4 py-2 text-gray-200">{row.criterion}</td>
                  <td className="px-4 py-2 text-gray-400">{row.required}</td>
                  <td className="px-4 py-2 text-gray-400">{row.actual}</td>
                  <td className="px-4 py-2 text-center">
                    {row.passed ? (
                      <CheckCircle2 size={16} className="text-green-400 inline-block" />
                    ) : (
                      <XCircle size={16} className="text-red-400 inline-block" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CONFIDENCE SCORE */}
      {result.confidenceScore != null && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            AI Confidence:{' '}
            <span className="text-cyan-400 font-semibold">{result.confidenceScore}%</span>
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* PAYMENT BUTTON */}
      <button
        onClick={onProcessPayment}
        disabled={isLoading}
        className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          result.approved
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-red-600 hover:bg-red-500 text-white'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : result.approved ? (
          '💸 Release Payment to Drone'
        ) : (
          '↩ Refund Creator'
        )}
      </button>
    </div>
  )
}
