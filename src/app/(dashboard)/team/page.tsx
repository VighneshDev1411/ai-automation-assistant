'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Crown,
  User,
  Trash2,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending'
  avatar_url?: string | null
  joined_at: string | null
  invited_at: string
}

export default function TeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('member')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentOrgId, setCurrentOrgId] = useState<string>('')

  useEffect(() => {
    loadTeamMembers()
  }, [])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get user's organization
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)

      // Filter for joined organizations and get the first one
      const membership = (memberships || []).find(m => m.joined_at !== null)

      if (!membership) {
        toast({
          title: 'Error',
          description: 'No organization found',
          variant: 'destructive'
        })
        return
      }
      setCurrentOrgId(membership.organization_id)

      // Load all team members with their profile info
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          invited_at,
          joined_at,
          profiles:user_id (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', membership.organization_id)
        .order('invited_at', { ascending: false })

      if (error) throw error

      const teamMembers: TeamMember[] = (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        name: member.profiles?.full_name || member.profiles?.email?.split('@')[0] || 'Unknown',
        email: member.profiles?.email || '',
        role: member.role,
        status: member.joined_at ? 'active' : 'pending',
        avatar_url: member.profiles?.avatar_url,
        joined_at: member.joined_at,
        invited_at: member.invited_at
      }))

      setMembers(teamMembers)
    } catch (error: any) {
      console.error('Error loading team members:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load team members',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: currentOrgId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Show error toast for specific error cases
        toast({
          title: 'Unable to Send Invitation',
          description: data.error || 'Failed to send invitation',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: data.userExists ? 'Member Added' : 'Invitation Sent',
        description: data.userExists
          ? `${inviteEmail} has been added to your organization`
          : `An invitation email has been sent to ${inviteEmail}`
      })

      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      loadTeamMembers()
    } catch (error: any) {
      console.error('Error inviting member:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: 'Error',
        description: 'You cannot remove yourself',
        variant: 'destructive'
      })
      return
    }

    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast({
        title: 'Member removed',
        description: 'Team member has been removed successfully'
      })

      loadTeamMembers()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive'
      })
    }
  }

  const handleChangeRole = async (memberId: string, userId: string, newRole: UserRole) => {
    if (userId === currentUserId) {
      toast({
        title: 'Error',
        description: 'You cannot change your own role',
        variant: 'destructive'
      })
      return
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      toast({
        title: 'Role updated',
        description: `Member role changed to ${newRole}`
      })

      loadTeamMembers()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive'
      })
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Crown className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        )
      case 'member':
        return (
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            Member
          </Badge>
        )
      case 'viewer':
        return (
          <Badge variant="outline">
            Viewer
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: 'active' | 'pending') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">Pending</Badge>
    }
  }

  const activeMembers = members.filter(m => m.status === 'active').length
  const pendingInvites = members.filter(m => m.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their access
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as UserRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                    <SelectItem value="member">Member - Can create and edit</SelectItem>
                    <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              In your organization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvites}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>People who have access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      {getRoleBadge(member.role)}
                      {getStatusBadge(member.status)}
                      {member.user_id === currentUserId && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      <span>
                        {member.joined_at
                          ? `Joined ${new Date(member.joined_at).toLocaleDateString()}`
                          : `Invited ${new Date(member.invited_at).toLocaleDateString()}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {member.role !== 'owner' && member.user_id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, member.user_id, 'admin')}>
                        Change to Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, member.user_id, 'member')}>
                        Change to Member
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, member.user_id, 'viewer')}>
                        Change to Viewer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles Description */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding team member roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Owner</p>
                <p className="text-muted-foreground">
                  Full control over the organization, billing, and all workflows
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-muted-foreground">
                  Can manage workflows, integrations, and invite team members
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium">Member</p>
                <p className="text-muted-foreground">
                  Can create and edit workflows, but cannot manage team
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium">Viewer</p>
                <p className="text-muted-foreground">
                  Read-only access to view workflows and analytics
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
