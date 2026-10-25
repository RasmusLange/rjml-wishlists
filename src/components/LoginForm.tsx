"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";

export default function LoginForm({ names }: { names: string[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action}>
      <div className="field">
        <span className="label">Who are you?</span>
        <div className="who" role="radiogroup">
          {names.map((name, i) => (
            <label key={name}>
              <input type="radio" name="name" value={name} defaultChecked={i === 0} />
              {name}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" className="input" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
