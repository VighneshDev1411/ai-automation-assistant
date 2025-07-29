import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/auth-context'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Automation Platform - Enterprise Workflow Automation',
  description: 'Build powerful AI-driven automation workflows for your enterprise',
  keywords: 'automation, AI, workflow, enterprise, integration',
  authors: [{ name: 'AI Automation Platform' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aiautomation.platform',
    title: 'AI Automation Platform',
    description: 'Build powerful AI-driven automation workflows for your enterprise',
    siteName: 'AI Automation Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Automation Platform',
    description: 'Build powerful AI-driven automation workflows for your enterprise',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}