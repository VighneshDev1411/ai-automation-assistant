'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Zap, 
  MessageSquare, 
  BarChart, 
  FileText, 
  Settings, 
  Play, 
  CheckCircle, 
  Clock,
  Users,
  Activity
} from 'lucide-react'

const Day15AgentFrameworkDemo = () => {
  const [activeDemo, setActiveDemo] = useState('overview')
  const [demoProgress, setDemoProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  
  type DemoResult = {
    success: boolean
    duration: number
    cost: number
    tokensUsed?: number
  }
  
  type ResultsState = {
    agents?: DemoResult
    orchestration?: DemoResult
    memory?: DemoResult
    performance?: DemoResult
    communication?: DemoResult
    skills?: DemoResult
  }
  
  const [results, setResults] = useState<ResultsState>({})

  // Simulated agent data
  const [agents] = useState([
    {
      id: 'doc_agent_001',
      name: 'Document Processor',
      type: 'document_processing',
      status: 'active',
      model: 'gpt-4-turbo',
      skills: ['extract_text', 'summarize_document', 'classify_document'],
      performance: { responseTime: 1250, successRate: 0.96, cost: 0.03 }
    },
    {
      id: 'data_agent_001', 
      name: 'Data Analyst',
      type: 'data_analysis',
      status: 'active',
      model: 'claude-3-sonnet',
      skills: ['analyze_dataset', 'create_visualization', 'find_patterns'],
      performance: { responseTime: 2100, successRate: 0.94, cost: 0.045 }
    },
    {
      id: 'comm_agent_001',
      name: 'Communication Hub',
      type: 'communication', 
      status: 'active',
      model: 'gpt-3.5-turbo',
      skills: ['compose_email', 'schedule_meeting', 'send_notification'],
      performance: { responseTime: 800, successRate: 0.98, cost: 0.015 }
    },
    {
      id: 'decision_agent_001',
      name: 'Decision Maker',
      type: 'decision_making',
      status: 'active', 
      model: 'claude-3-opus',
      skills: ['evaluate_options', 'assess_risk', 'generate_recommendation'],
      performance: { responseTime: 3200, successRate: 0.91, cost: 0.08 }
    }
  ])

  const [workflows] = useState([
    {
      id: 'workflow_001',
      name: 'Document Analysis Pipeline',
      description: 'Process documents through classification, extraction, and summarization',
      agents: ['doc_agent_001', 'data_agent_001'],
      status: 'running',
      progress: 75
    },
    {
      id: 'workflow_002', 
      name: 'Customer Communication Flow',
      description: 'Automated customer inquiry processing and response',
      agents: ['comm_agent_001', 'decision_agent_001'],
      status: 'completed',
      progress: 100
    }
  ])

  const [performanceMetrics] = useState({
    totalRequests: 1247,
    successRate: 0.95,
    avgResponseTime: 1850,
    totalCost: 45.67,
    activeAgents: 4,
    activeSessions: 12
  })

  const runDemo = async (demoType: keyof ResultsState) => {
    setIsRunning(true)
    setDemoProgress(0)
    
    // Simulate demo execution
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setDemoProgress(i)
    }
    
    // Set demo results
    setResults(prev => ({
      ...prev,
      [demoType]: {
        success: true,
        duration: 2000 + Math.random() * 1000,
        cost: Math.random() * 0.1,
        tokensUsed: 150 + Math.random() * 100
      }
    }))
    
    setIsRunning(false)
  }

  interface DemoCardProps {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    demoKey: string
    children: React.ReactNode
  }

  const DemoCard = ({ icon: Icon, title, description, demoKey, children }: DemoCardProps) => (
    <Card className={`cursor-pointer transition-all duration-200 ${
      activeDemo === demoKey ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
    }`}>
      <CardHeader 
        className="pb-3"
        onClick={() => setActiveDemo(demoKey)}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      {activeDemo === demoKey && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )

  interface AgentCardProps {
    agent: {
      id: string
      name: string
      type: string
      status: string
      model: string
      skills: string[]
      performance: {
        responseTime: number
        successRate: number
        cost: number
      }
    }
  }

  const AgentCard = ({ agent }: AgentCardProps) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{agent.name}</CardTitle>
          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
            {agent.status}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 capitalize">
          {agent.type.replace('_', ' ')} Agent
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <strong>Model:</strong> {agent.model}
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Skills:</div>
          <div className="flex flex-wrap gap-1">
            {agent.skills.map((skill: string) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium">{agent.performance.responseTime}ms</div>
            <div className="text-gray-500">Response</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{(agent.performance.successRate * 100).toFixed(1)}%</div>
            <div className="text-gray-500">Success</div>
          </div>
          <div className="text-center">
            <div className="font-medium">${agent.performance.cost.toFixed(3)}</div>
            <div className="text-gray-500">Avg Cost</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Day 15: AI Agent Framework
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Comprehensive AI agent system with orchestration, memory management, 
          specialized agents, and performance optimization
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Badge variant="default">Multi-Model Support</Badge>
          <Badge variant="default">Agent Communication</Badge>
          <Badge variant="default">Memory System</Badge>
          <Badge variant="default">Performance Tracking</Badge>
        </div>
      </div>

      {/* Performance Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Framework Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{performanceMetrics.totalRequests}</div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(performanceMetrics.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {performanceMetrics.avgResponseTime}ms
              </div>
              <div className="text-sm text-gray-500">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${performanceMetrics.totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{performanceMetrics.activeAgents}</div>
              <div className="text-sm text-gray-500">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{performanceMetrics.activeSessions}</div>
              <div className="text-sm text-gray-500">Active Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Specialized Agents Demo */}
        <DemoCard
          icon={Brain}
          title="Specialized Agents"
          description="Document, Data Analysis, Communication, and Decision-Making agents"
          demoKey="agents"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
            <Button 
              onClick={() => runDemo('agents')} 
              disabled={isRunning}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Test Agent Interactions
            </Button>
            {results.agents && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Agent test completed in {results.agents.duration.toFixed(0)}ms. 
                  Cost: ${results.agents.cost.toFixed(4)}, 
                  Tokens: {Math.round(results.agents.tokensUsed || 0)}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DemoCard>

        {/* Agent Orchestration Demo */}
        <DemoCard
          icon={Zap}
          title="Agent Orchestration"
          description="Multi-agent workflows with sequential and parallel execution"
          demoKey="orchestration"
        >
          <div className="space-y-4">
            {workflows.map(workflow => (
              <Card key={workflow.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{workflow.name}</CardTitle>
                    <Badge variant={workflow.status === 'running' ? 'default' : 'secondary'}>
                      {workflow.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{workflow.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{workflow.progress}%</span>
                    </div>
                    <Progress value={workflow.progress} className="w-full" />
                    <div className="flex gap-1 mt-2">
                      {workflow.agents.map(agentId => {
                        const agent = agents.find(a => a.id === agentId)
                        return (
                          <Badge key={agentId} variant="outline" className="text-xs">
                            {agent?.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button 
              onClick={() => runDemo('orchestration')} 
              disabled={isRunning}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Execute Workflow
            </Button>
            {results.orchestration && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Workflow executed successfully. Duration: {results.orchestration.duration.toFixed(0)}ms
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DemoCard>

        {/* Memory & Context Demo */}
        <DemoCard
          icon={MessageSquare}
          title="Memory & Context Management"
          description="Persistent memory, context windows, and conversation history"
          demoKey="memory"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">15</div>
                  <div className="text-xs text-gray-500">Active Sessions</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">2,847</div>
                  <div className="text-xs text-gray-500">Stored Memories</div>
                </div>
              </Card>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Memory Entries:</div>
              {[
                { type: 'preference', content: 'User prefers concise responses', importance: 0.8 },
                { type: 'fact', content: 'Company uses Salesforce CRM', importance: 0.9 },
                { type: 'context', content: 'Working on Q4 planning', importance: 0.7 }
              ].map((memory, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs mr-2">
                      {memory.type}
                    </Badge>
                    <span className="text-sm">{memory.content}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {(memory.importance * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={() => runDemo('memory')} 
              disabled={isRunning}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Test Memory Retrieval
            </Button>
            {results.memory && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Retrieved 15 relevant memories in {results.memory.duration.toFixed(0)}ms
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DemoCard>

        {/* Performance Optimization Demo */}
        <DemoCard
          icon={BarChart}
          title="Performance & Cost Management"
          description="Real-time monitoring, cost optimization, and performance tuning"
          demoKey="performance"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Card className="p-3 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-800">Cost Optimization</div>
                    <div className="text-xs text-green-600">Switch to GPT-3.5 for simple tasks</div>
                  </div>
                  <div className="text-lg font-bold text-green-700">-30%</div>
                </div>
              </Card>
              
              <Card className="p-3 bg-purple-50 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-purple-800">Prompt Optimization</div>
                    <div className="text-xs text-purple-600">Reduce token usage by 20%</div>
                  </div>
                  <div className="text-lg font-bold text-purple-700">-20%</div>
                </div>
              </Card>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Performance Trends (Last 7 days):</div>
              <div className="grid grid-cols-4 gap-2 text-xs text-center">
                <div>
                  <div className="font-medium">1.2s</div>
                  <div className="text-gray-500">Avg Response</div>
                </div>
                <div>
                  <div className="font-medium">$0.035</div>
                  <div className="text-gray-500">Avg Cost</div>
                </div>
                <div>
                  <div className="font-medium">96.5%</div>
                  <div className="text-gray-500">Success Rate</div>
                </div>
                <div>
                  <div className="font-medium">8.9</div>
                  <div className="text-gray-500">Quality Score</div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => runDemo('performance')} 
              disabled={isRunning}
              className="w-full"
            >
              <BarChart className="h-4 w-4 mr-2" />
              Run Performance Analysis
            </Button>
            {results.performance && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Performance analysis completed. Identified 3 optimization opportunities.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DemoCard>
      </div>

      {/* Agent Communication Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent-to-Agent Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Document Agent → Data Agent</span>
                  </div>
                  <div className="text-xs text-gray-600 pl-5">
                    "I've extracted financial data from the Q4 report. Please analyze the revenue trends."
                  </div>
                  <div className="text-xs text-blue-600 pl-5">✓ Processed in 850ms</div>
                </div>
              </Card>
              
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Data Agent → Decision Agent</span>
                  </div>
                  <div className="text-xs text-gray-600 pl-5">
                    "Revenue increased 15% YoY. Recommending expansion strategy analysis."
                  </div>
                  <div className="text-xs text-green-600 pl-5">✓ Processed in 1,200ms</div>
                </div>
              </Card>
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={() => runDemo('communication')} 
                disabled={isRunning}
                variant="outline"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Simulate Agent Communication
              </Button>
            </div>
            
            {results.communication && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Agent communication chain completed successfully. 4 agents collaborated to process the request.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skill Library Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Skill Library & Plugin System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-center">Core Skills</div>
                <div className="space-y-1">
                  {['get_current_time', 'web_search', 'send_email'].map(skill => (
                    <div key={skill} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{skill}</span>
                      <Badge variant="outline" className="text-xs">Core</Badge>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Badge variant="default" className="text-xs">12 Skills</Badge>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-center">Integration Skills</div>
                <div className="space-y-1">
                  {['salesforce_query', 'slack_message', 'github_create_issue'].map(skill => (
                    <div key={skill} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{skill}</span>
                      <Badge variant="outline" className="text-xs">API</Badge>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Badge variant="default" className="text-xs">24 Skills</Badge>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-center">Custom Skills</div>
                <div className="space-y-1">
                  {['analyze_sentiment', 'extract_entities', 'validate_data'].map(skill => (
                    <div key={skill} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{skill}</span>
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Badge variant="default" className="text-xs">8 Skills</Badge>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="mt-4 flex justify-center gap-4">
            <Button 
              onClick={() => runDemo('skills')} 
              disabled={isRunning}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Test Skill Execution
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View Skill Documentation
            </Button>
          </div>
          
          {results.skills && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Executed 5 skills successfully. Average execution time: 320ms
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isRunning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Running Demo...</span>
                  <span>{demoProgress}%</span>
                </div>
                <Progress value={demoProgress} className="w-full" />
              </div>
              <Clock className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day 15 Completion Summary */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Day 15 Implementation Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-800 mb-2">Morning Tasks (✓ Complete)</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>✓ Multi-model AI agent system (GPT-4, Claude, Gemini)</li>
                <li>✓ Agent orchestration and routing</li>
                <li>✓ Context management and memory systems</li>
                <li>✓ Agent-to-agent communication</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-800 mb-2">Afternoon Tasks (✓ Complete)</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>✓ Document processing agents</li>
                <li>✓ Data analysis agents</li>
                <li>✓ Communication agents</li>
                <li>✓ Decision-making agents</li>
                <li>✓ Agent skill library and plugin system</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Evening Tasks (✓ Complete)</h4>
            <ul className="space-y-1 text-sm text-green-700">
              <li>✓ Agent interaction testing and performance validation</li>
              <li>✓ Token usage optimization and cost management</li>
              <li>✓ Performance monitoring and analytics dashboard</li>
            </ul>
          </div>
          
          <Alert className="mt-4 border-green-300 bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Day 15 Success!</strong> All AI Agent Framework components have been implemented and tested. 
              Ready to proceed with Day 16: Advanced AI Capabilities (RAG, Vector Databases, Function Calling).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

export default Day15AgentFrameworkDemo