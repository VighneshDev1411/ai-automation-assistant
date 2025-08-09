// src/app/env-test/page.tsx
export default function EnvTestPage() {
  // Get values at build time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Check</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_URL</h2>
          {url ? (
            <>
              <p className="text-green-600">✅ Set</p>
              <p className="text-sm mt-1 font-mono break-all">{url}</p>
            </>
          ) : (
            <p className="text-red-600">❌ Not set</p>
          )}
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
          {hasAnonKey ? (
            <p className="text-green-600">✅ Set (hidden for security)</p>
          ) : (
            <p className="text-red-600">❌ Not set</p>
          )}
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">SUPABASE_SERVICE_ROLE_KEY</h2>
          {hasServiceKey ? (
            <p className="text-green-600">✅ Set (hidden for security)</p>
          ) : (
            <p className="text-red-600">❌ Not set</p>
          )}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Create a <code className="bg-gray-100 px-1">.env.local</code> file in your project root</li>
            <li>Add these variables from your Supabase dashboard:</li>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-key...`}
            </pre>
            <li>Get these from: Supabase Dashboard → Settings → API</li>
            <li><strong className="text-red-600">Important:</strong> Restart your dev server after adding env variables!</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm">
            <strong>Your Supabase URL should be:</strong><br/>
            <code className="text-xs">https://hpelxxyntnhbtslphsar.supabase.co</code>
          </p>
        </div>
      </div>
    </div>
  )
}
