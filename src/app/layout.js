import "./globals.css";

export const metadata = {
  title: "Agent Mira Real Estate Chatbot",
  description: "Search and save properties based on user preferences.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
