import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section style={{ textAlign: 'center', padding: '64px 0' }}>
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <Link to="/">Back to Discover</Link>
    </section>
  )
}
