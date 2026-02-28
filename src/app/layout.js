import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image';
import Link from 'next/link';
import "./globals.css";
import styles from './layout.module.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "OpenStream",
  description: "OpenStream — signup + invite flow for Jellyfin/Emby",
  icons: {
    icon: [{ url: '/openstream-favicon.png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <Link className={styles.logoLink} href="/" aria-label="OpenStream">
              <Image
                className={styles.logo}
                src="/openstream-logo.png"
                alt="OpenStream"
                width={512}
                height={256}
                priority
                style={{ width: 'auto', height: '192px' }}
              />
            </Link>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
