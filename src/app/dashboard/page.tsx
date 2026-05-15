import AuthGuard from '../../components/AuthGuard'
import DashboardContent from '../../components/DashboardContent'

export default function DashboardPage(){
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
