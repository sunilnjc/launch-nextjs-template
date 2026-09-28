import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Your app", description: "Your new app is live." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
