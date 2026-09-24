import { Suspense } from "react";
import LoginForm from "./LoginForm";

// useSearchParams() (used inside LoginForm, to read ?next=... after a
// redirect-to-login) requires a Suspense boundary for Next.js's static
// prerendering — without this the production build fails outright, it's
// not optional. Keep the login page split this way: page.tsx stays a
// (non-"use client") wrapper, all the actual interactivity lives in
// LoginForm.tsx.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
