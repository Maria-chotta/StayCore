import "./layout.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>The all‑in‑one hospitality management platform</h1>
        <p className="lead">
          Manage reservations, distribution, operations and revenue in one
          elegant system built for hotels, hostels and groups.
        </p>

        <div className="hero-ctas">
          <button className="btn-primary">Start free trial</button>
          <button className="btn-ghost">Request a demo</button>
        </div>

        <div className="trust">
          <span>Trusted by</span>
          <div className="logos">
            <img src="/assets/logo1.png" alt="logo" />
            <img src="/assets/logo2.png" alt="logo" />
            <img src="/assets/logo3.png" alt="logo" />
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <img src="/assets/hero-illustration.svg" alt="Dashboard preview" />
      </div>
    </section>
  );
}
