export const metadata = {
  title: 'Sumo Robot Control',
  description: 'WebSocket control for sumo robot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}
