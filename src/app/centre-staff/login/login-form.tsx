'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm({ centres }: { centres: { id: string; label: string }[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [centreId, setCentreId] = useState(centres[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/staff/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, centreId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message ?? `Erreur ${res.status}`)
        return
      }
      router.push('/centre-staff')
      router.refresh()
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-space-3">
      <label className="flex flex-col gap-space-1">
        <span className="text-fs-300 font-bold text-color-text-primary">Centre</span>
        <select
          required
          value={centreId}
          onChange={(e) => setCentreId(e.target.value)}
          className="min-h-[var(--tap-min)] rounded-gj-md border border-color-border px-space-3 text-fs-300 bg-white"
        >
          {centres.length === 0 && <option value="">— Aucun centre —</option>}
          {centres.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>
      <Input
        id="staff-email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        id="staff-password"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="MVP : non vérifié (whitelist email)."
      />
      {error && (
        <p role="alert" className="text-fs-300 font-bold text-gj-red">{error}</p>
      )}
      <Button type="submit" loading={loading} disabled={loading}>
        Se connecter
      </Button>
    </form>
  )
}
