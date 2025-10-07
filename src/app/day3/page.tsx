'use client'

import { useState } from 'react'
// import { WorkflowVersionControl } from '@/components/workflow-builder/WorkflowVersionControl'
import { WorkflowVersionControl } from '../components/workflow-builder/WorkflowVersionControl'
// import { WorkflowTesting } from '@/components/workflow-builder/WorkflowTesting'
import { WorkflowTesting } from '../components/workflow-builder/WorkflowTesting'
import { WorkflowTemplates } from '../components/workflow-builder/WorkflowTemplates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Day3TestPage() {
  const [currentWorkflow] = useState({
    id: 'test-workflow-123',
    name: 'Test Workflow',
    version: 1,
    config: {
      nodes: [
        { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start' } },
        { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Action 1' } }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' }
      ]
    }
  })

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Day 3 Component Testing</h1>
      
      <Tabs defaultValue="versions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="versions">Version Control</TabsTrigger>
          <TabsTrigger value="testing">Testing Tools</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="mt-6">
          <WorkflowVersionControl
            workflowId={currentWorkflow.id}
            workflowName={currentWorkflow.name}
            currentVersion={currentWorkflow.version}
            currentConfig={currentWorkflow.config}
            onRestore={(version) => console.log('Restore version:', version)}
            onCompare={(v1, v2) => console.log('Compare:', v1, v2)}
          />
        </TabsContent>

        <TabsContent value="testing" className="mt-6">
          <WorkflowTesting
            workflowId={currentWorkflow.id}
            workflowName={currentWorkflow.name}
            workflowConfig={currentWorkflow.config}
            onExecutionComplete={(result) => console.log('Execution complete:', result)}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates
            onSelectTemplate={(template) => console.log('Selected:', template)}
            onImport={(config) => console.log('Import:', config)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}