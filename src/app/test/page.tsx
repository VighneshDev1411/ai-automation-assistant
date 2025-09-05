'use client'

import { useState } from 'react'
import { ConditionalIntegration } from '@/lib/workflow-engine/integrations/ConditionalIntegration'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConditional = async () => {
    setLoading(true)
    try {
      const testResult = await ConditionalIntegration.executeConditionalAction({
        type: 'if-then-else',
        condition: { field: 'user.status', operator: 'equals', value: 'active' },
        thenActions: [{ type: 'log', config: { message: 'User is active!' } }],
        elseActions: [{ type: 'log', config: { message: 'User is not active' } }]
      }, {
        variables: { user: { status: 'active' } }
      })
      
      setResult(testResult)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) })
    }
    setLoading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Conditional Integration Test</h1>
      
      <button 
        onClick={testConditional}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Conditional Logic'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}