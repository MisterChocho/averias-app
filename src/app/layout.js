import "./globals.css";

export const metadata = {
  title: "Atención de averías",
  description: "Sistema de gestión de técnicos y órdenes de servicio - Grupo 04",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
