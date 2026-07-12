import { createAuthClient } from "better-auth/react";

// The auth server lives on the Express backend, not in this Next.js app.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export const { signIn, signOut, useSession } = authClient;
