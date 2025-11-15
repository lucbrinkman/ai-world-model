'use client'

import { useEffect, useState } from 'react'
import { getUserScenarios, deleteScenario, type SavedScenario } from '@/lib/actions/scenarios'

interface SavedScenariosListProps {
  onLoad: (sliderValues: number[]) => void
  refreshTrigger: number
}

export function SavedScenariosList({ onLoad, refreshTrigger }: SavedScenariosListProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadScenarios() {
      setLoading(true)
      setError(null)

      const result = await getUserScenarios()

      if (result.error) {
        setError(result.error)
      } else {
        setScenarios(result.data || [])
      }

      setLoading(false)
    }

    loadScenarios()
  }, [refreshTrigger])

  const handleDelete = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) {
      return
    }

    setDeletingId(scenarioId)

    const result = await deleteScenario(scenarioId)

    if (result.error) {
      alert(result.error)
    } else {
      // Remove from local state
      setScenarios((prev) => prev.filter((s) => s.id !== scenarioId))
    }

    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
        {error}
      </div>
    )
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        No saved scenarios yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {scenarios.map((scenario) => (
        <div
          key={scenario.id}
          className="bg-gray-800 rounded-md p-3 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => onLoad(scenario.slider_values)}
              className="flex-1 text-left"
            >
              <div className="font-medium text-sm">{scenario.name}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(scenario.created_at).toLocaleDateString()}
              </div>
            </button>
            <button
              onClick={() => handleDelete(scenario.id)}
              disabled={deletingId === scenario.id}
              className="text-red-400 hover:text-red-300 disabled:opacity-50"
              title="Delete scenario"
            >
              {deletingId === scenario.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
