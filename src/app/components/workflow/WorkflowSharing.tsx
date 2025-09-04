'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import {
  Share,
  Users,
  Copy,
  Link,
  Mail,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Plus,
  Globe,
  Lock,
  UserPlus,
  Settings,
  Download,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'declined'
  addedAt: string
  lastActive?: string
}

interface WorkflowShare {
  id: string
  workflowId: string
  workflowName: string
  shareType: 'private' | 'team' | 'organization' | 'public'
  shareLink?: string
  password?: string
  expiresAt?: string
  allowDownload: boolean
  allowComments: boolean
  trackViews: boolean
  collaborators: Collaborator[]
  createdAt: string
}

interface WorkflowSharingProps {
  workflowId: string
  workflowName: string
  onClose?: () => void
}

const mockCollaborators: Collaborator[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    avatar: '/avatars/alice.jpg',
    role: 'editor',
    status: 'active',
    addedAt: '2024-01-10',
    lastActive: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@company.com',
    role: 'viewer',
    status: 'active',
    addedAt: '2024-01-12',
    lastActive: '2024-01-14T15:45:00Z',
  },
  {
    id: '3',
    name: 'Carol Davis',
    email: 'carol@company.com',
    role: 'editor',
    status: 'pending',
    addedAt: '2024-01-14',
  },
]

export const WorkflowSharing = ({
  workflowId,
  workflowName,
  onClose,
}: WorkflowSharingProps) => {
  const [shareSettings, setShareSettings] = useState<WorkflowShare>({
    id: '1',
    workflowId,
    workflowName,
    shareType: 'private',
    shareLink: `https://platform.ai/share/workflow/${workflowId}/abc123`,
    allowDownload: false,
    allowComments: true,
    trackViews: true,
    collaborators: mockCollaborators,
    createdAt: '2024-01-10',
  })

  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('')
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<
    'editor' | 'viewer'
  >('viewer')
  const [inviteMessage, setInviteMessage] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const { toast } = useToast()

  const handleShareTypeChange = (
    shareType: 'private' | 'team' | 'organization' | 'public'
  ) => {
    setShareSettings((prev: any) => ({ ...prev, shareType }))
    toast({
      title: 'Share Settings Updated',
      description: `Workflow is now ${shareType}`,
    })
  }

  const handleInviteCollaborator = async () => {
    if (!newCollaboratorEmail) return
    setIsInviting(true)

    // Simulating the API Call
    await new Promise((resolve: any) => setTimeout(resolve, 1000))

    const newCollaborator: Collaborator = {
      id: Date.now().toString(),
      name: newCollaboratorEmail.split('@')[0],
      email: newCollaboratorEmail,
      role: newCollaboratorRole,
      status: 'pending',
      addedAt: new Date().toISOString().split('T')[0],
    }

    setShareSettings((prev: any) => ({
      ...prev,
      collaborators: [...prev.collaborators, newCollaborator],
    }))

    setNewCollaboratorEmail('')
    setInviteMessage('')
    setIsInviting(false)

    toast({
      title: 'Invitation Sent',
      description: `Invitation sent to ${newCollaboratorEmail}.`,
    })
  }

  // Now removing the collaborator

  const handleRemoveCollaborator = (collaboratorId: string) => {
    setShareSettings((prev: any) => ({
      ...prev,
      collaborators: prev.collaborators.filter(
        (c: any) => c.id !== collaboratorId
      ),
    }))

    toast({
      title: 'Collaborator Removed',
      description: 'Collaborator has been removed from this workflow.',
    })
  }

  const handleRoleChange = (
    collaboratorId: string,
    newRole: 'editor' | 'viewer'
  ) => {
    setShareSettings((prev: any) => ({
      ...prev,
      collaborators: prev.collaborators.map((c: any) => {
        c.id === collaboratorId ? { ...c, role: newRole } : c
      }),
    }))
    toast({
      title: 'Role Updated',
      description: 'Collaborator role has been updated.',
    })
  }
  const copyShareLink = () => {
    if (shareSettings.shareLink) {
      navigator.clipboard.writeText(shareSettings.shareLink)
      toast({
        title: 'Link Copied',
        description: 'Share link copied to clipboard.',
      })
    }
  }

  const getShareIcon = () => {
    switch (shareSettings.shareType) {
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'team':
        return <Users className="h-4 w-4" />
      case 'organization':
        return <Globe className="h-4 w-4" />
      case 'public':
        return <Globe className="h-4 w-4" />
      default:
        return <Lock className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'declined':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'badge-info'
      case 'editor':
        return 'badge-success'
      case 'viewer':
        return 'badge-neutral'
      default:
        return 'badge-neutral'
    }
  }
  return (
    <div className="space-y-6">
      {/* Share Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Share Settings
          </CardTitle>
          <CardDescription>
            Control who can access and collaborate on this workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Share Type */}
          <div className="space-y-3">
            <Label>Share Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  type: 'private',
                  label: 'Private',
                  icon: Lock,
                  desc: 'Only invited people',
                },
                {
                  type: 'team',
                  label: 'Team',
                  icon: Users,
                  desc: 'Anyone in your team',
                },
                {
                  type: 'organization',
                  label: 'Organization',
                  icon: Globe,
                  desc: 'Anyone in your org',
                },
                {
                  type: 'public',
                  label: 'Public',
                  icon: Globe,
                  desc: 'Anyone with the link',
                },
              ].map(({ type, label, icon: Icon, desc }) => (
                <div
                  key={type}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    shareSettings.shareType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent/50'
                  }`}
                  onClick={() => handleShareTypeChange(type as any)}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Icon className="h-5 w-5" />
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Link */}
          {shareSettings.shareLink && (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareSettings.shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyShareLink} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Share Options */}
          <div className="space-y-4">
            <Label>Permissions</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Allow Downloads</div>
                  <div className="text-xs text-muted-foreground">
                    Allow collaborators to download the workflow
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shareSettings.allowDownload}
                  onChange={e =>
                    setShareSettings(prev => ({
                      ...prev,
                      allowDownload: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Allow Comments</div>
                  <div className="text-xs text-muted-foreground">
                    Allow collaborators to leave comments
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shareSettings.allowComments}
                  onChange={e =>
                    setShareSettings(prev => ({
                      ...prev,
                      allowComments: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Track Views</div>
                  <div className="text-xs text-muted-foreground">
                    Track who views this workflow
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shareSettings.trackViews}
                  onChange={e =>
                    setShareSettings(prev => ({
                      ...prev,
                      trackViews: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collaborators */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaborators ({shareSettings.collaborators.length})
          </CardTitle>
          <CardDescription>
            Manage who can access and edit this workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Collaborator */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <Label>Invite Collaborator</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Enter email address"
                value={newCollaboratorEmail}
                onChange={e => setNewCollaboratorEmail(e.target.value)}
                type="email"
              />

              <Select
                value={newCollaboratorRole}
                onValueChange={(value: 'editor' | 'viewer') =>
                  setNewCollaboratorRole(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleInviteCollaborator}
                disabled={!newCollaboratorEmail || isInviting}
                className="w-full"
              >
                {isInviting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>

            <Textarea
              placeholder="Add a personal message (optional)"
              value={inviteMessage}
              onChange={e => setInviteMessage(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Collaborators List */}
          <div className="space-y-3">
            {shareSettings.collaborators.map(collaborator => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={collaborator.avatar} />
                    <AvatarFallback>
                      {collaborator.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{collaborator.name}</span>
                      {getStatusIcon(collaborator.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {collaborator.email}
                    </div>
                    {collaborator.lastActive && (
                      <div className="text-xs text-muted-foreground">
                        Last active:{' '}
                        {new Date(collaborator.lastActive).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(collaborator.role)}>
                    {collaborator.role}
                  </Badge>

                  {collaborator.role !== 'owner' && (
                    <div className="flex items-center gap-1">
                      <Select
                        value={collaborator.role}
                        onValueChange={(value: 'editor' | 'viewer') =>
                          handleRoleChange(collaborator.id, value)
                        }
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() =>
                          handleRemoveCollaborator(collaborator.id)
                        }
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {shareSettings.collaborators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No collaborators yet. Invite someone to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Download className="h-5 w-5" />
              <span className="text-sm">Export</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm">Import</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Copy className="h-5 w-5" />
              <span className="text-sm">Duplicate</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">Comments</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const WorkflowSharingDialog = ({
  workflowId,
  workflowName,
}: {
  workflowId: string
  workflowName: string
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share "{workflowName}"</DialogTitle>
          <DialogDescription>
            Collaborate with your team by sharing this workflow.
          </DialogDescription>
        </DialogHeader>

        <WorkflowSharing
          workflowId={workflowId}
          workflowName={workflowName}
          onClose={() => setIsOpen(false)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button className="btn-shine">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
