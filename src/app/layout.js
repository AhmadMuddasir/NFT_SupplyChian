import "./globals.css";
import { Providers } from "./providers.js";
import Navbar from "@/components/Navbar";
export const metadata = {
  title: "AutoPart supplychain",
  description: "NFT-based auto part supply chain management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col " suppressHydrationWarning>
        <main>
          <Providers>
            <Navbar />
            <main>{children}</main>
          </Providers>
        </main>
      </body>
    </html>
  );
}


