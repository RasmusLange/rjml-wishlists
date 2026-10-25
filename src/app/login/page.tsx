import { redirect } from "next/navigation";
import { currentUser, getUsers, setupProblem } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
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
        <LoginForm names={names} />
      )}
    </main>
  );
}
