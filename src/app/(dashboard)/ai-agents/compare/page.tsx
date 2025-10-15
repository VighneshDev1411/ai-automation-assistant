import { Metadata } from 'next'
import { AIModelComparisonTool } from '@/components/ai/AIModelComparisonTool'

export const metadata: Metadata = {
  title: 'AI Model Comparison | AI Automation Platform',
  description: 'Compare AI models side-by-side to find the best model for your needs',
}

export default function ModelComparisonPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <AIModelComparisonTool />
    </div>
  )
}
