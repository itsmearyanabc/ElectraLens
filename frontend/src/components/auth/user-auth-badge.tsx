"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { useState } from "react";

export function UserAuthBadge() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-[84px] rounded-full bg-[#F2F4F7] border border-[#E4E7EC] animate-pulse" />
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="btn-pill text-xs py-1.5 px-3.5 border border-[#D0D5DD] bg-white text-[#172033] hover:bg-[#F7F8FA] font-medium transition-colors inline-flex items-center gap-1.5 shadow-xs"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-[#D0D5DD] bg-white hover:bg-[#F7F8FA] transition-colors focus:outline-none"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={24}
            height={24}
            className="rounded-full ring-1 ring-[#D0D5DD]"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#EAF0FC] text-[#2864DC] flex items-center justify-center text-xs font-bold">
            <User className="w-3.5 h-3.5" />
          </div>
        )}
        <span className="text-xs font-medium text-[#172033] max-w-[100px] truncate">
          {session.user.name || session.user.email}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#E4E7EC] shadow-lg py-2 z-50 text-xs">
          <div className="px-3 py-2 border-b border-[#F2F4F7]">
            <p className="font-semibold text-[#172033] truncate">{session.user.name}</p>
            <p className="text-[#667085] text-[11px] truncate">{session.user.email}</p>
          </div>
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
