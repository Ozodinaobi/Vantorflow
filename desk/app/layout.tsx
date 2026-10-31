import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Vantorflow | Desk",description:"Vantorflow account and platform oversight"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
