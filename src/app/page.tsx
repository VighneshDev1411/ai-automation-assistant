import { redirect } from 'next/navigation'

export default function HomePage() {
  // Simple redirect to login - let login page handle auth checks
  redirect('/login')
}
