"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FileText, MessageSquare, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { SessionProvider } from "next-auth/react";

function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[70px] bg-[#fafafa] border-r border-[#e5e5e5] flex flex-col items-center py-4 z-50">
      <Link href="/documents" className="mb-8">
        <FileText className="h-6 w-6" />
      </Link>

      <nav className="flex-1 flex flex-col items-center gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
              pathname.startsWith(link.href)
                ? "bg-[#0a0a0a] text-white"
                : "text-[#666] hover:bg-[#e5e5e5]"
            )}
            title={link.label}
          >
            <link.icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-2">
        {session?.user?.image && (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-10 h-10 flex items-center justify-center text-[#666] hover:bg-[#e5e5e5] rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <Sidebar />
        <main className="ml-[70px]">{children}</main>
      </div>
    </SessionProvider>
  );
}
