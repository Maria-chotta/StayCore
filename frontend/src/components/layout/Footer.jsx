import "./layout.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <strong>StayCore</strong> — Hotel & Hospitality Platform
          <div className="muted">© {new Date().getFullYear()} StayCore. All rights reserved.</div>
        </div>

        <div>
          <a href="#">Privacy</a> · <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
