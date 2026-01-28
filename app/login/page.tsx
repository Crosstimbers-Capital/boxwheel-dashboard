'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('from') || '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push(redirectTo)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'hsl(var(--ink-muted))' }}
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: 'hsl(var(--border))',
            background: 'hsl(var(--steel))',
          }}
          placeholder="Enter dashboard password"
          required
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'hsl(var(--alert))' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded py-2 text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          background: 'hsl(var(--lime))',
          color: 'hsl(220 13% 10%)',
        }}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'hsl(var(--asphalt))' }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{ background: 'hsl(var(--steel))' }}
      >
        <div className="text-center mb-6">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded font-bold"
            style={{
              background: 'hsl(var(--lime))',
              color: 'hsl(220 13% 10%)',
            }}
          >
            BW
          </div>
          <h1 className="text-lg font-semibold">Boxwheel Dashboard</h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'hsl(var(--ink-muted))' }}
          >
            Fleet management and analytics
          </p>
        </div>

        <Suspense
          fallback={
            <div
              className="h-32 animate-pulse rounded"
              style={{ background: 'hsl(var(--steel-dim))' }}
            />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
