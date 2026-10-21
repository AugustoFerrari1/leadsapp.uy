import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'BarberLeads UY — Generación de Leads para Barberías en Uruguay',
  description:
    'Plataforma para scraping, gestión y contacto automático de barberías en Uruguay vía WhatsApp y Email.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-[#0a0a0f] text-white antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  )
}
