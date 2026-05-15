import AdminPendingGate from '../../../components/AdminPendingGate'

export const metadata = { title: 'Admin — Pending Signups' }

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <AdminPendingGate />
    </div>
  )
}
