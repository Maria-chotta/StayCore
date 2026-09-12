import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await login(email, password);
      const hasHotelMembership = Array.isArray(response?.user?.memberships) && response.user.memberships.length > 0;

      navigate(hasHotelMembership ? "/dashboard" : "/properties/onboarding");
    } catch (err) {
      if (!err.response) {
        // No HTTP response at all: backend unreachable, network
        // failure or CORS — NOT bad credentials. Show the real
        // cause instead of a misleading message.
        setError(
          "Cannot reach the server. Make sure the backend is running at http://127.0.0.1:8000."
        );
      } else if (err.response.status === 401) {
        setError(
          err.response?.data?.detail ||
          "Invalid email or password."
        );
      } else {
        setError(
          `Login failed (${err.response.status}). Please try again.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-brand"><span>◆</span> StayCore</div>
        <div className="login-intro">
          <p className="login-eyebrow">Hospitality operations, in sync</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to keep your property moving with clarity.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email</label>

            <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@hotel.com" required />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>

            <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
        <p className="login-footer">Secure access for authorized StayCore teams.</p>
      </section>
      <aside className="login-aside"><span className="login-aside-mark">01</span><h2>Every shift,<br />one clear view.</h2><p>Reservations, rooms, guests, and daily operations connected in one calm workspace.</p></aside>
    </main>
  );
}

export default Login;
