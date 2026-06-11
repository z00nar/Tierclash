/* tier-auth.jsx — login / sign-up / guest. Wired to Firebase Auth. */

// Turns Firebase's error codes into friendly messages.
function authError(err) {
  const map = {
    "auth/invalid-email": "That email doesn't look right.",
    "auth/user-not-found": "No account with that email — try signing up.",
    "auth/wrong-password": "Wrong password.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/email-already-in-use": "That email already has an account — try logging in.",
    "auth/weak-password": "Password should be at least 6 characters.",
  };
  return map[err.code] || "Something went wrong — try again.";
}

function AuthForm({ onAuth }) {
  const [mode, setMode] = React.useState("login"); // 'login' | 'signup'
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [role, setRole] = React.useState("admin"); // demo convenience
  const [err, setErr] = React.useState("");

  const submit = (e) => {
    e && e.preventDefault();
    if (!/.+@.+\..+/.test(email)) return setErr("Enter a valid email.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (mode === "signup" && !name.trim()) return setErr("Pick a display name.");
    setErr("");
    const displayName = mode === "signup" ? name.trim() : (email.split("@")[0].replace(/[^a-z0-9]/gi, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "You");

    // Real Firebase login or sign-up:
    const authCall = mode === "signup"
      ? firebase.auth().createUserWithEmailAndPassword(email, pw)
      : firebase.auth().signInWithEmailAndPassword(email, pw);

    authCall
      .then((cred) => onAuth({ uid: cred.user.uid, displayName, role }))
      .catch((error) => setErr(authError(error)));
  };

  const guest = () => {
    // Anonymous sign-in (needs "Anonymous" enabled in the console).
    firebase.auth().signInAnonymously()
      .then((cred) => onAuth({ uid: cred.user.uid, displayName: "Guest", role: "player" }))
      .catch((error) => setErr(authError(error)));
  };

  return (
    <div className="tc-auth">
      <div className="tc-auth-glow" />
      <form className="tc-auth-card" onSubmit={submit}>
        <div className="tc-auth-logo"><Logo size={34} /></div>
        <p className="tc-auth-tagline">Settle the debate. Live.</p>

        <div className="tc-auth-tabs">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }}>Log in</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); }}>Sign up</button>
          <span className="tc-auth-tabs-ind" style={{ transform: `translateX(${mode === "login" ? 0 : 100}%)` }} />
        </div>

        {mode === "signup" && (
          <label className="tc-field">
            <span>Display name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" />
          </label>
        )}
        <label className="tc-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="tc-field">
          <span>Password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </label>

        <div className="tc-auth-role">
          <span className="tc-auth-role-label">Join this demo as</span>
          <div className="tc-seg">
            <button type="button" className={role === "admin" ? "on" : ""} onClick={() => setRole("admin")}>Admin</button>
            <button type="button" className={role === "player" ? "on" : ""} onClick={() => setRole("player")}>Player</button>
          </div>
        </div>

        {err && <div className="tc-auth-err">{err}</div>}

        <button type="submit" className="tc-btn tc-btn--accent tc-btn--block">
          {mode === "login" ? "Log in" : "Create account"}
        </button>

        <button type="button" className="tc-auth-guest" onClick={guest}>Continue as guest →</button>
      </form>
      <div className="tc-auth-foot">Real-time tier-list battles · built for the room you're in</div>
    </div>
  );
}

Object.assign(window, { AuthForm });