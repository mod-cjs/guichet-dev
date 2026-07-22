import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadMyChannelPreferences } from '@/lib/notifications/preferences'
import { ChannelPreferencesClient } from '@/components/notifications/ChannelPreferencesClient'

export const metadata: Metadata = { title: 'Préférences de notification' }
export const dynamic = 'force-dynamic'

export default async function PreferencesNotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const prefs = await loadMyChannelPreferences()

  return (
    <div>
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Préférences de notification
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Choisissez comment le Guichet vous contacte. Les notifications dans l’application sont
          toujours actives ; activez WhatsApp, SMS ou e-mail pour les recevoir aussi par ces
          canaux. Vous pouvez changer d’avis à tout moment.
        </p>
      </header>
      <ChannelPreferencesClient initial={prefs} />
    </div>
  )
}
