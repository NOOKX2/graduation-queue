import "./globals.css";

export const metadata = {
  title: "Graduation Queue",
  description: "ระบบจัดคิวถ่ายรูปรับปริญญา"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
