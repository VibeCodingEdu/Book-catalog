import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "קטלוג Merkos",
  description: "קטלוג ספרים, חוברות ודברי דפוס",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <header className="site">
          <div className="container">
            <h1>קטלוג Merkos</h1>
            <span className="status">ספרים · חוברות · דברי דפוס</span>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
