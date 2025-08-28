// src/lib/integrations/providers/github.ts
import { BaseIntegration, IntegrationConfig, IntegrationCredentials, IntegrationAction, IntegrationTrigger } from '../base-integration'

// 
export class GitHubIntegration extends BaseIntegration {
  constructor() {
    const config: IntegrationConfig = {
      provider: 'github',
      name: 'GitHub',
      description: 'Manage repositories, issues, pull requests, and automate development workflows',
      authType: 'oauth2',
      scopes: [
        'repo',
        'read:user',
        'user:email',
        'read:org',
        'notifications',
        'write:repo_hook'
      ],
      endpoints: {
        auth: 'https://github.com/login/oauth/authorize',
        token: 'https://github.com/login/oauth/access_token',
        revoke: 'https://api.github.com/applications/{client_id}/grant'
      },
      rateLimit: {
        requests: 5000,
        per: 'hour'
      }
    }
    
    super(config)
  }

  async authenticate(params: { code: string; redirectUri: string }): Promise<IntegrationCredentials> {
    const clientId = process.env.GITHUB_CLIENT_ID!
    const clientSecret = process.env.GITHUB_CLIENT_SECRET!

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri
      })
    })

    if (!response.ok) {
      throw new Error(`GitHub OAuth failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
    }
    
    return {
      access_token: data.access_token,
      scope: data.scope,
      token_type: data.token_type
    }
  }

  async refreshToken(): Promise<IntegrationCredentials> {
    // GitHub tokens don't expire, return existing credentials
    if (!this.credentials) {
      throw new Error('No credentials available')
    }
    return this.credentials
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credentials?.access_token) return false

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${this.credentials.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    return response.ok
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue in a GitHub repository',
        inputs: {
          owner: { type: 'string', required: true, description: 'Repository owner' },
          repo: { type: 'string', required: true, description: 'Repository name' },
          title: { type: 'string', required: true, description: 'Issue title' },
          body: { type: 'string', required: false, description: 'Issue description' },
          labels: { type: 'array', required: false, description: 'Issue labels' },
          assignees: { type: 'array', required: false, description: 'User logins to assign' }
        },
        outputs: {
          issue_number: { type: 'number', description: 'Created issue number' },
          issue_url: { type: 'string', description: 'URL to the issue' },
          issue_id: { type: 'number', description: 'Issue ID' }
        }
      },
      {
        id: 'create_pull_request',
        name: 'Create Pull Request',
        description: 'Create a new pull request',
        inputs: {
          owner: { type: 'string', required: true, description: 'Repository owner' },
          repo: { type: 'string', required: true, description: 'Repository name' },
          title: { type: 'string', required: true, description: 'PR title' },
          head: { type: 'string', required: true, description: 'Branch with changes' },
          base: { type: 'string', required: true, description: 'Target branch' },
          body: { type: 'string', required: false, description: 'PR description' },
          draft: { type: 'boolean', required: false, description: 'Create as draft' }
        },
        outputs: {
          pr_number: { type: 'number', description: 'Pull request number' },
          pr_url: { type: 'string', description: 'URL to the pull request' },
          pr_id: { type: 'number', description: 'Pull request ID' }
        }
      },
      {
        id: 'add_comment',
        name: 'Add Comment',
        description: 'Add a comment to an issue or pull request',
        inputs: {
          owner: { type: 'string', required: true, description: 'Repository owner' },
          repo: { type: 'string', required: true, description: 'Repository name' },
          issue_number: { type: 'number', required: true, description: 'Issue or PR number' },
          body: { type: 'string', required: true, description: 'Comment text' }
        },
        outputs: {
          comment_id: { type: 'number', description: 'Created comment ID' },
          comment_url: { type: 'string', description: 'URL to the comment' }
        }
      },
      {
        id: 'create_repository',
        name: 'Create Repository',
        description: 'Create a new GitHub repository',
        inputs: {
          name: { type: 'string', required: true, description: 'Repository name' },
          description: { type: 'string', required: false, description: 'Repository description' },
          private: { type: 'boolean', required: false, description: 'Create as private repository' },
          auto_init: { type: 'boolean', required: false, description: 'Initialize with README' }
        },
        outputs: {
          repo_id: { type: 'number', description: 'Repository ID' },
          repo_url: { type: 'string', description: 'Repository URL' },
          clone_url: { type: 'string', description: 'Clone URL' }
        }
      },
      {
        id: 'merge_pull_request',
        name: 'Merge Pull Request',
        description: 'Merge a pull request',
        inputs: {
          owner: { type: 'string', required: true, description: 'Repository owner' },
          repo: { type: 'string', required: true, description: 'Repository name' },
          pull_number: { type: 'number', required: true, description: 'Pull request number' },
          commit_title: { type: 'string', required: false, description: 'Merge commit title' },
          merge_method: { type: 'string', required: false, description: 'merge, squash, or rebase' }
        },
        outputs: {
          sha: { type: 'string', description: 'Merge commit SHA' },
          merged: { type: 'boolean', description: 'Whether merge was successful' }
        }
      },
      {
        id: 'create_webhook',
        name: 'Create Webhook',
        description: 'Create a repository webhook',
        inputs: {
          owner: { type: 'string', required: true, description: 'Repository owner' },
          repo: { type: 'string', required: true, description: 'Repository name' },
          url: { type: 'string', required: true, description: 'Webhook URL' },
          events: { type: 'array', required: true, description: 'Webhook events to subscribe to' },
          secret: { type: 'string', required: false, description: 'Webhook secret' }
        },
        outputs: {
          webhook_id: { type: 'number', description: 'Created webhook ID' },
          webhook_url: { type: 'string', description: 'Webhook URL' }
        }
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'push',
        name: 'Repository Push',
        description: 'Triggers when code is pushed to repository',
        webhook: true
      },
      {
        id: 'pull_request',
        name: 'Pull Request Events',
        description: 'Triggers on PR opened, closed, merged, etc.',
        webhook: true
      },
      {
        id: 'issues',
        name: 'Issue Events',
        description: 'Triggers when issues are created, updated, closed',
        webhook: true
      },
      {
        id: 'release',
        name: 'Release Created',
        description: 'Triggers when a new release is created',
        webhook: true
      },
      {
        id: 'star',
        name: 'Repository Starred',
        description: 'Triggers when repository is starred',
        webhook: true
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    if (!this.credentials?.access_token) {
      throw new Error('Integration not authenticated')
    }

    switch (actionId) {
      case 'create_issue':
        return this.createIssue(inputs)
      case 'create_pull_request':
        return this.createPullRequest(inputs)
      case 'add_comment':
        return this.addComment(inputs)
      case 'create_repository':
        return this.createRepository(inputs)
      case 'merge_pull_request':
        return this.mergePullRequest(inputs)
      case 'create_webhook':
        return this.createWebhook(inputs)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async makeGitHubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw this.handleApiError({ response: { status: response.status }, ...error })
    }

    return response.json()
  }

  private async createIssue(inputs: {
    owner: string
    repo: string
    title: string
    body?: string
    labels?: string[]
    assignees?: string[]
  }): Promise<any> {
    const data = await this.makeGitHubRequest(`/repos/${inputs.owner}/${inputs.repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: inputs.title,
        body: inputs.body,
        labels: inputs.labels,
        assignees: inputs.assignees
      })
    })

    return {
      issue_number: data.number,
      issue_url: data.html_url,
      issue_id: data.id
    }
  }

  private async createPullRequest(inputs: {
    owner: string
    repo: string
    title: string
    head: string
    base: string
    body?: string
    draft?: boolean
  }): Promise<any> {
    const data = await this.makeGitHubRequest(`/repos/${inputs.owner}/${inputs.repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: inputs.title,
        head: inputs.head,
        base: inputs.base,
        body: inputs.body,
        draft: inputs.draft || false
      })
    })

    return {
      pr_number: data.number,
      pr_url: data.html_url,
      pr_id: data.id
    }
  }

  private async addComment(inputs: {
    owner: string
    repo: string
    issue_number: number
    body: string
  }): Promise<any> {
    const data = await this.makeGitHubRequest(
      `/repos/${inputs.owner}/${inputs.repo}/issues/${inputs.issue_number}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({
          body: inputs.body
        })
      }
    )

    return {
      comment_id: data.id,
      comment_url: data.html_url
    }
  }

  private async createRepository(inputs: {
    name: string
    description?: string
    private?: boolean
    auto_init?: boolean
  }): Promise<any> {
    const data = await this.makeGitHubRequest('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: inputs.name,
        description: inputs.description,
        private: inputs.private || false,
        auto_init: inputs.auto_init || false
      })
    })

    return {
      repo_id: data.id,
      repo_url: data.html_url,
      clone_url: data.clone_url
    }
  }

  private async mergePullRequest(inputs: {
    owner: string
    repo: string
    pull_number: number
    commit_title?: string
    merge_method?: string
  }): Promise<any> {
    const data = await this.makeGitHubRequest(
      `/repos/${inputs.owner}/${inputs.repo}/pulls/${inputs.pull_number}/merge`,
      {
        method: 'PUT',
        body: JSON.stringify({
          commit_title: inputs.commit_title,
          merge_method: inputs.merge_method || 'merge'
        })
      }
    )

    return {
      sha: data.sha,
      merged: data.merged
    }
  }

  private async createWebhook(inputs: {
    owner: string
    repo: string
    url: string
    events: string[]
    secret?: string
  }): Promise<any> {
    const data = await this.makeGitHubRequest(`/repos/${inputs.owner}/${inputs.repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: inputs.events,
        config: {
          url: inputs.url,
          content_type: 'json',
          secret: inputs.secret,
          insecure_ssl: '0'
        }
      })
    })

    return {
      webhook_id: data.id,
      webhook_url: data.config.url
    }
  }
}