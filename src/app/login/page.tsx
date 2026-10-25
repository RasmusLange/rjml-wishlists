import { redirect } from "next/navigation";
import { currentUser, getUsers } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const names = getUsers().map((u) => u.name);
  return (
    <main className="sheet login">
      <p className="eyebrow">Welcome back</p>
      <h1>Wishlists</h1>
      {names.length === 0 ? (
        <p className="error" style={{ marginTop: 24 }}>
          No users are set up yet. Add APP_USERS to the environment settings.
        </p>
      ) : (
        <LoginForm names={names} />
      )}
    </main>
  );
}
