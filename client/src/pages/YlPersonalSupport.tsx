import { useEffect } from "react";

export default function YlPersonalSupport() {
  useEffect(() => {
    // Redirect to WhatsApp immediately
    window.location.href = "https://wa.me/918510889286";
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#EEE9DF]">
      <div className="text-center">
        <p className="text-[#1B2632] text-lg">Redirecting to WhatsApp...</p>
      </div>
    </div>
  );
}
