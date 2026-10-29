import React, { useState, useEffect } from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { useNavigate } from "react-router";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const [randomImage] = useState(() =>
    Math.random() < 0.5
      ? "/images/grid-image/login1.png"
      : "/images/grid-image/login2.png"
  );

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="hidden w-full h-full lg:w-1/2 lg:block relative overflow-hidden">
          <img
            src={randomImage}
            alt="Auth Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-12 text-white">
            <blockquote className="space-y-3 max-w-lg">
              <p className="text-xl font-medium leading-relaxed italic">
                "Through hard work and commitment every player can achieve their true potential"
              </p>
              <footer className="text-xs font-bold tracking-wider uppercase text-slate-300">
                — CoachMax football academy
              </footer>
            </blockquote>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
