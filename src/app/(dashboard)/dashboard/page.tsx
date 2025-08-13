import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResponsiveGrid } from '@/components/layout/responsive-grid'
import { 
  BarChart3, 
  Users, 
  Activity, 
  TrendingUp, 
  Plus,
  Workflow,
  Zap
} from 'lucide-react'
import { ResponsiveContainer } from '@/components/layout/container'

// Mock data - in real app, this would come from Supabase
const mockStats = [
  {
    title: 'Active Workflows',
    value: '24',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Workflow, // fixed here
  },
  {
    title: 'Executions Today',
    value: '1,847',
    change: '+23%',
    changeType: 'positive' as const,
    icon: Zap,
  },
  {
    title: 'Success Rate',
    value: '98.2%',
    change: '+2.1%',
    changeType: 'positive' as const,
    icon: TrendingUp,
  },
  {
    title: 'Team Members',
    value: '8',
    change: '+2',
    changeType: 'positive' as const,
    icon: Users,
  },
]


export default function DashboardPage() {
  // TODO: Add authentication check
  // const user = await getUser()
  // if (!user) redirect('/login')

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with your automations."
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <ResponsiveGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6} className="mb-8">
        {mockStats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="glass-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className={`text-sm ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change} from last month
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </ResponsiveGrid>

      {/* Quick Actions */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 flex flex-col">
              <Plus className="h-6 w-6 mb-2" />
              Create Workflow
            </Button>
            <Button variant="outline" className="h-16 flex flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              View Analytics
            </Button>
            <Button variant="outline" className="h-16 flex flex-col">
              <Activity className="h-6 w-6 mb-2" />
              Check Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-semibold mb-2">🎉 Welcome to your dashboard!</h3>
          <p className="text-muted-foreground">
            You're all set up and ready to automate. Start by creating your first workflow.
          </p>
        </CardContent>
      </Card>
    </ResponsiveContainer>
  )
}