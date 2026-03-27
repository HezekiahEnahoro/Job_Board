"use client";

import { Suspense } from "react";
import AuthForm from "./AuthForm";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
          <div className="min-h-[80vh] flex items-center justify-center">
            <div className="animate-pulse space-y-6">
              <div className="h-12 w-64 bg-white/5 rounded-lg mx-auto"></div>
              <div className="h-96 w-full max-w-md bg-white/5 rounded-3xl mx-auto"></div>
            </div>
          </div>
        </div>
      }>
      <AuthForm />
    </Suspense>
  );
}
