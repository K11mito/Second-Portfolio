import Admin from './Admin'

export const metadata = {
  title: 'Summit board',
  robots: { index: false, follow: false },
}

// The owner's page for the summit board: every note, and a way to take one down.
// It needs the key set as SUMMIT_ADMIN_KEY in the project's environment.
export default function SummitAdminPage() {
  return <Admin />
}
