"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Label, TextField } from "@heroui/react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await authClient.signIn.email({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message ?? "Sign in failed");
      return;
    }
    router.push("/overview");
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center p-6">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Card.Title>Admin sign in</Card.Title>
          <Card.Description>
            Enter your credentials to access the dashboard
          </Card.Description>
        </Card.Header>
        <Form onSubmit={onSubmit} validationBehavior="aria">
          <Card.Content>
            <div className="flex flex-col gap-4">
              <TextField
                isRequired
                name="email"
                type="email"
                value={email}
                onChange={setEmail}
              >
                <Label>Email</Label>
                <Input
                  placeholder="email@example.com"
                  autoComplete="email"
                  variant="secondary"
                />
              </TextField>

              <TextField
                isRequired
                name="password"
                type="password"
                value={password}
                onChange={setPassword}
              >
                <Label>Password</Label>
                <Input
                  placeholder="••••••••"
                  autoComplete="current-password"
                  variant="secondary"
                />
              </TextField>

              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </Card.Content>
          <Card.Footer className="mt-4">
            <Button className="w-full" type="submit" isPending={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </main>
  );
}
