import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: "RentLease - Tenant & Landlord Resolution Engine",
    description: "AI-powered dispute resolution, legal insights, and practical advice for renters and property owners.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className} suppressHydrationWarning={true}>{children}</body>
        </html>
    )
}
