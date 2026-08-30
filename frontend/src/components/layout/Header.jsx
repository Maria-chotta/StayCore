import { Link } from "react-router-dom";
import "./layout.css";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <div className="brand"><Link to="/" className="logo"><i>◆</i> StayCore</Link></div>

        <nav className="nav">
          <a href="#platform">Platform</a><a href="#operations">Operations</a><a href="#about">Why StayCore</a>
          <Link to="/login" className="cta small">Sign in</Link>
          <a href="#demo" className="cta primary">Get started →</a>
        </nav>
      </div>
    </header>
  );
}
