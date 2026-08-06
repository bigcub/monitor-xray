import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monitor X-Ray — An Interactive Hardware Explainer",
  description: "Pull apart a modern monitor and see how size, panel type, resolution, refresh rate and hidden layers work together.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
