export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4">
        <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    </div>
  )
}
