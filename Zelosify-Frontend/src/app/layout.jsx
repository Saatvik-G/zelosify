import "@/styles/globals.css";
import AllProvider from "@/redux/core/AllProvider";

// Metadata (App Router style)
export const metadata = {
  title: "Zelosify",
  description: "Zelosify",
  icons: {
    icon: "/favicon1.ico",
  },
};

// Shim uninitialized Node.js 22/25 experimental localStorage to prevent SSR crashes
if (
  typeof globalThis.localStorage !== "undefined" &&
  typeof globalThis.localStorage.getItem !== "function"
) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <AllProvider>{children}</AllProvider>
      </body>
    </html>
  );
}
