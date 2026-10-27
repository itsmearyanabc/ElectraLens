import './globals.css';

// Reached only for paths outside every locale (the proxy sends everything else to /en or /hi).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-mist p-6 text-center">
        <main>
          <h1 className="text-3xl">Page not found · पृष्ठ नहीं मिला</h1>
          <p className="mt-4">
            <a href="/en">Go to ElectraLens</a> · <a href="/hi">इलेक्ट्रालेंस पर जाएँ</a>
          </p>
        </main>
      </body>
    </html>
  );
}
