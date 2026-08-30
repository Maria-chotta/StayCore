import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

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
      await login(email, password);

      navigate("/dashboard");
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
    <div>
      <h1>StayCore</h1>

      <p>
        Hotel & Hospitality Management Platform
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            required
          />
        </div>

        {error && (
          <p>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default Login;
