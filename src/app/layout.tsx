import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dewy - Wedding Invitation Editor',
  description: '둘이니까, 쉬워지니까. AI 웨딩플래너와 함께하는 결혼준비',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
