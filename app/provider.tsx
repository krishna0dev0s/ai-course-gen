"use client";
import React, { useEffect, useState } from "react";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "./_components/Header";
import Footer from "./_components/Footer";

const DarkVeil = dynamic(() => import("@/components/DarkVeil"), { ssr: false });
const ClickSpark = dynamic(() => import("@/components/ClickSpark"), { ssr: false });

function Provider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const showHomeBg = pathname === "/" || pathname.startsWith("/course/");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const clearStaleClientCache = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
      } catch {
      }
    };

    clearStaleClientCache();
  }, []);

  const [userDetails, setUserDetails] = useState(null);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    CreateNewUser();
  }, [isLoaded, isSignedIn]);

  const CreateNewUser = async () => {
    try {
      const result = await fetch("/api/user", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (result.ok) {
        const data = await result.json();
        setUserDetails(data);
        return;
      }

      setUserDetails(null);
    } catch {
      setUserDetails(null);
    }
  };

  const content = (
    <div className="relative z-10">
      {showHomeBg && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <DarkVeil
            hueShift={0}
            noiseIntensity={0}
            scanlineIntensity={0}
            speed={0.5}
            scanlineFrequency={0}
            warpAmount={0}
          />
        </div>
      )}
      <UserDetailContext.Provider value={{ userDetails, setUserDetails }}>
        <div><Header />{children}<Footer /></div>
      </UserDetailContext.Provider>
    </div>
  );

  return (
    showHomeBg ? <ClickSpark>{content}</ClickSpark> : content
  );
}

export default Provider;