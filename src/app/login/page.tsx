import { redirect } from "next/navigation";
import { currentUser, getUsers, safeNext, setupProblem } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  const names = getUsers().map((u) => u.name);
  const problem = setupProblem();
  return (
    <main className="sheet login">
      <p className="eyebrow">Welcome back</p>
      <h1>Wishlists</h1>
      {problem ? (
        <p className="error" style={{ marginTop: 24 }}>
          {problem}
        </p>
      ) : (
        <LoginForm names={names} next={next} />
      )}
    </main>
  );
}
