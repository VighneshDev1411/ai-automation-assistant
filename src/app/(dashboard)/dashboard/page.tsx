'use client'

import { useAuth } from '@/lib/auth/auth-context'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileUpload } from '@/components/storage/file-upload'
import {
  Loader2,
  User,
  Building,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  BarChart3,
  Activity,
  Zap,
  Users,
  Clock,
  TrendingUp,
  Workflow,
  Bot,
  Upload,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const {
    user,
    profile,
    organizations,
    currentOrganization,
    loading,
    refreshProfile,
  } = useAuth()

  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [forceShowContent, setForceShowContent] = useState(false)
  const [stats, setStats] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    executionsToday: 0,
    successRate: 0,
  })

  // Keep hooks always at the top
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Dashboard loading timeout - forcing content to show')
        setForceShowContent(true)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [loading])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/dashboard')
        const data = await response.json()

        setStats({
          totalWorkflows: data.totalWorkflows || 0,
          activeWorkflows: data.activeWorkflows || 0,
          executionsToday: data.executionsToday || 0,
          successRate: data.successRate || 0,
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setForceShowContent(false)
    try {
      await refreshProfile()
    } catch (error) {
      console.error('Manual refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // More robust checks
  const profileLoaded = !!profile
  const organizationsLoaded =
    Array.isArray(organizations) && organizations.length > 0

  const shouldShowDashboard =
    !loading ||
    forceShowContent ||
    (user && (profileLoaded || organizationsLoaded))

  if (!shouldShowDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
            <p className="text-muted-foreground">
              Preparing your automation platform...
            </p>
            <button
              onClick={handleRefresh}
              className="text-sm text-primary hover:underline"
              disabled={isRefreshing}
            >
              {isRefreshing
                ? 'Refreshing...'
                : 'Taking too long? Click to refresh'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard stats cards configuration
  const statsCards = [
    {
      title: 'Total Workflows',
      value: stats.totalWorkflows.toString(),
      icon: Workflow,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Active Automations',
      value: stats.activeWorkflows.toString(),
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Executions Today',
      value: stats.executionsToday.toString(),
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          {loading && !forceShowContent && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Still loading some data in the background...
            </div>
          )}
        </div>

        {/* Show refresh button prominently if still having issues */}
        {(loading || !profileLoaded || !organizationsLoaded) && (
          <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Some data is still loading
                </span>
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  'Refresh Now'
                )}
              </Button>
            </div>
          </div>
        )}
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Welcome back
                    {profile?.full_name
                      ? `, ${profile.full_name.split(' ')[0]}`
                      : ''}
                    !
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Your AI automation platform is ready
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={isRefreshing}
                className="btn-glass flex items-center gap-2 hover:bg-accent transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>

              <Button
                onClick={() => router.push('/workflow-builder')}
                className="btn-shine bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {/* User Profile Card */}
          <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  User Profile
                </CardTitle>
                <div className="flex items-center gap-2">
                  {profileLoaded ? (
                    <span className="status-badge success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </span>
                  ) : (
                    <span className="status-badge warning">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <User className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {profileLoaded ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold mb-1">
                      {profile.full_name || 'Anonymous User'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Profile synchronized
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Loading profile data...
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse w-2/3"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Card */}
          <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  Organization
                </CardTitle>
                <div className="flex items-center gap-2">
                  {organizationsLoaded ? (
                    <span className="status-badge success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </span>
                  ) : (
                    <span className="status-badge warning">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Building className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {organizationsLoaded ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold mb-1">
                      {currentOrganization?.name || 'Personal Workspace'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {organizations.length} workspace
                      {organizations.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Organization active
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Loading workspace...
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full animate-pulse w-1/2"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group md:col-span-2 xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-medium text-muted-foreground">
                System Status
              </CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Platform Status
                  </span>
                  <span className="status-badge success">
                    Operational
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Database</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Authentication
                    </span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">AI Services</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>

                {profileLoaded && organizationsLoaded && (
                  <div className="flex items-center gap-2 pt-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      All systems operational
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card
                key={index}
                className="metric-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <div className="text-3xl font-bold">{stat.value}</div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions Section */}
        <Card className="glass-card border-0 shadow-lg mb-12">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">
                  Quick Actions
                </CardTitle>
                <CardDescription className="mt-1">
                  Common tasks to get you started with automation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => router.push('/workflow-builder')}
                variant="outline"
                className="btn-glass h-20 flex flex-col gap-2 hover:bg-accent hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium">Create Workflow</span>
              </Button>

              <Button
                variant="outline"
                className="btn-glass h-20 flex flex-col gap-2 hover:bg-accent hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium">View Analytics</span>
              </Button>

              <Button
                variant="outline"
                className="btn-glass h-20 flex flex-col gap-2 hover:bg-accent hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium">Add Integration</span>
              </Button>

              <Button
                variant="outline"
                className="btn-glass h-20 flex flex-col gap-2 hover:bg-accent hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium">Manage Team</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section - RESTORED */}
        <Card className="glass-card border-0 shadow-lg mb-12">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">
                  File Upload & Storage
                </CardTitle>
                <CardDescription className="mt-1">
                  Upload documents, images, and data files for your workflows
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FileUpload />
          </CardContent>
        </Card>

        {/* Welcome Message or Data Loading */}
        {profileLoaded && organizationsLoaded ? (
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                Everything's Ready!
              </h3>
              <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
                Your AI automation platform is fully loaded and ready to go.
                Start by creating your first workflow or exploring the
                integrations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => router.push('/workflow-builder')}
                  className="btn-shine bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Workflow className="h-4 w-4 mr-2" />
                  Create Your First Workflow
                </Button>
                <Button
                  variant="outline"
                  className="btn-glass hover:bg-accent transition-colors"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Explore AI Agents
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Loading Your Data...</h3>
              <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
                Please wait while we load your profile and workspace
                information. This should only take a moment.
              </p>

              <div className="space-y-3 mb-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 text-sm">
                  {profileLoaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <span
                    className={
                      profileLoaded ? 'text-green-600' : 'text-muted-foreground'
                    }
                  >
                    Profile: {profileLoaded ? 'Loaded' : 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {organizationsLoaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <span
                    className={
                      organizationsLoaded
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }
                  >
                    Workspace: {organizationsLoaded ? 'Loaded' : 'Loading...'}
                  </span>
                </div>
              </div>

              {!profileLoaded && !organizationsLoaded && (
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={isRefreshing}
                  className="btn-glass hover:bg-accent transition-colors"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Refresh
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}