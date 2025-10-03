'use client'

import { useState } from 'react'
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
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  avatar?: string
  joinedAt: string
}

export default function TeamPage() {
  const { toast } = useToast()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('member')

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'You',
      email: 'you@example.com',
      role: 'owner',
      status: 'active',
      joinedAt: 'Jan 2024'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: 'Feb 2024'
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike@example.com',
      role: 'member',
      status: 'active',
      joinedAt: 'Mar 2024'
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily@example.com',
      role: 'member',
      status: 'pending',
      joinedAt: 'Invited 2 days ago'
    },
    {
      id: '5',
      name: 'Alex Kumar',
      email: 'alex@example.com',
      role: 'viewer',
      status: 'active',
      joinedAt: 'Mar 2024'
    }
  ])

  const handleInvite = () => {
    if (!inviteEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      })
      return
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      joinedAt: 'Invited just now'
    }

    setMembers([...members, newMember])
    setInviteDialogOpen(false)
    setInviteEmail('')
    setInviteRole('member')

    toast({
      title: 'Invitation sent',
      description: `Invited ${inviteEmail} as ${inviteRole}`
    })
  }

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId))
    toast({
      title: 'Member removed',
      description: 'Team member has been removed successfully'
    })
  }

  const handleChangeRole = (memberId: string, newRole: TeamMember['role']) => {
    setMembers(members.map(m =>
      m.id === memberId ? { ...m, role: newRole } : m
    ))
    toast({
      title: 'Role updated',
      description: `Member role changed to ${newRole}`
    })
  }

  const getRoleBadge = (role: TeamMember['role']) => {
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

  const getStatusBadge = (status: TeamMember['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">Pending</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
    }
  }

  const activeMembers = members.filter(m => m.status === 'active').length
  const pendingInvites = members.filter(m => m.status === 'pending').length

  return (
    <div className="space-y-6">
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
                  onValueChange={(value) => setInviteRole(value as TeamMember['role'])}
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
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      {getRoleBadge(member.role)}
                      {getStatusBadge(member.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      <span>Joined {member.joinedAt}</span>
                    </div>
                  </div>
                </div>

                {member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>
                        Change to Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'member')}>
                        Change to Member
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'viewer')}>
                        Change to Viewer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
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
