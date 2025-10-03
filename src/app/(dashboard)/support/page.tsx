'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HelpCircle,
  Mail,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function SupportPage() {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject || !category || !message || !email) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    toast({
      title: 'Support ticket created',
      description: 'We\'ll get back to you within 24 hours'
    })

    // Reset form
    setSubject('')
    setCategory('')
    setMessage('')
    setEmail('')
  }

  const faqs = [
    {
      question: 'How do I create my first workflow?',
      answer: 'Navigate to the Workflows page and click "Create Workflow". Use the visual builder to add triggers, actions, and conditions. Once configured, save and activate your workflow.'
    },
    {
      question: 'How do I connect a Slack workspace?',
      answer: 'Go to Integrations page, find Slack, and click "Connect". You\'ll be redirected to authorize the app. Make sure to invite the bot to channels where you want to send messages.'
    },
    {
      question: 'What triggers are available?',
      answer: 'We support Webhooks, Scheduled triggers (cron), API calls, and event-based triggers from integrations like Slack, Google Calendar, and more.'
    },
    {
      question: 'How do I debug a failing workflow?',
      answer: 'Check the Analytics page to view execution logs. Each execution shows detailed error messages, execution time, and step-by-step results.'
    },
    {
      question: 'Can I use custom code in workflows?',
      answer: 'Yes! Use the "Run Function" action to write custom JavaScript code. You have access to workflow context and can transform data as needed.'
    },
    {
      question: 'How much does it cost?',
      answer: 'We offer a free tier with up to 100 workflow executions per month. Paid plans start at $29/month with unlimited executions and advanced features.'
    },
    {
      question: 'How do I invite team members?',
      answer: 'Go to the Team page and click "Invite Member". Enter their email and select a role (Admin, Member, or Viewer). They\'ll receive an invitation email.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. All data is encrypted at rest and in transit. We use industry-standard security practices and are SOC 2 compliant.'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground mt-2">
          Get help with your workflows and integrations
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
            <CardTitle className="text-base">Documentation</CardTitle>
            <CardDescription className="text-xs">
              Browse guides and tutorials
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
            <CardTitle className="text-base">Community</CardTitle>
            <CardDescription className="text-xs">
              Join our Discord server
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CheckCircle2 className="h-8 w-8 text-purple-600 mb-2" />
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription className="text-xs">
              Check system status
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <Mail className="h-8 w-8 text-orange-600 mb-2" />
            <CardTitle className="text-base">Email Us</CardTitle>
            <CardDescription className="text-xs">
              support@example.com
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Send us a message and we'll get back to you soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="integration">Integration Help</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* FAQs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Response Times */}
          <Card>
            <CardHeader>
              <CardTitle>Response Times</CardTitle>
              <CardDescription>
                When you can expect to hear from us
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Critical Issues</p>
                  <p className="text-sm text-muted-foreground">
                    Within 4 hours (24/7)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">General Support</p>
                  <p className="text-sm text-muted-foreground">
                    Within 24 hours (business days)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Feature Requests</p>
                  <p className="text-sm text-muted-foreground">
                    Within 3-5 business days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <Card>
            <CardHeader>
              <CardTitle>More Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/docs"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-medium">View Documentation</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>

              <a
                href="https://discord.gg/example"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">Join Discord Community</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>

              <a
                href="https://status.example.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">System Status</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
