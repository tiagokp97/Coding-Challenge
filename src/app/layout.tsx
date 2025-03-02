import './globals.css';
import ClientReduxProvider from './components/ClientReduxProvider';
import { Toaster } from "./components/ui/sonner"

export const metadata = {
  title: 'Super call ia',
  description: 'IA Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>
        <ClientReduxProvider>{children}</ClientReduxProvider>
        <Toaster />
      </body>
    </html>
  );
}
