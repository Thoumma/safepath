import type { Metadata } from "next";
import { Noto_Sans_Lao, Archivo, JetBrains_Mono } from "next/font/google";
import { FirebaseAnalytics } from "@/components/firebase-analytics";
import "./globals.css";

// Lao script carries the meaning.
const notoLao = Noto_Sans_Lao({
  subsets: ["lao", "latin"],
  variable: "--font-noto-lao",
  display: "swap",
});

// Latin + numerals ride on a grotesque. Archivo descends from the Swiss
// grotesque tradition and has the tabular figures an ops console needs.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

// Reference numbers, coordinates, clocks — anything an officer reads aloud
// over a phone line, where 0/O and 1/l must not be confusable.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafeZone Response Console · ສູນຕອບໂຕ້",
  description: "ຈັດການ ເຫດການ SOS ຂອງ ນັກທ່ອງທ່ຽວ ລາວ — ສະຖານທູດ · VFI · SafePath",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="lo"
      className={`${notoLao.variable} ${archivo.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Resolve the theme before first paint. Without this the console
            flashes light before switching to dark — on a night shift that
            flash is the brightest thing in the room. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('safezone-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
