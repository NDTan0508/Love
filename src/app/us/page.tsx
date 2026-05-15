import Link from 'next/link'
import AuthGuard from '../../components/AuthGuard'

const usLinks = [
  { href: '/us/photos', title: 'Kho ảnh', helper: 'Lưu ảnh chung, xem lại theo dạng lưới và mở ảnh toàn màn hình.' },
  { href: '/games', title: 'Chơi cùng nhau', helper: 'Quiz hiểu nhau realtime.' },
  { href: '/date-ideas', title: 'Ý tưởng hẹn hò', helper: 'Chọn nhanh một buổi hẹn phù hợp.' },
  { href: '/gifts', title: 'Wishlist', helper: 'Những điều mỗi người mong muốn trong tương lai.' }
]

export default function UsHubPage() {
  return (
    <AuthGuard>
      <div className="love-page">
        <header className="mb-5">
          <p className="love-kicker">Us</p>
          <h1 className="mt-2 love-title">Không gian chơi và chăm nhau</h1>
        </header>

        <section className="grid gap-3">
          {usLinks.map((item) => (
            <Link key={item.href} href={item.href} className="love-card block transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-sm font-bold text-indigo-950">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.helper}</p>
            </Link>
          ))}
        </section>
      </div>
    </AuthGuard>
  )
}
