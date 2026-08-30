import "./layout.css";

function Card({ title, children, icon, number }) {
  return (
    <div className="feature-card">
      <span className="feature-number">{number}</span><div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function Features() {
  return (
    <div id="features" className="features-grid">
      <Card number="01" icon="▦" title="Every stay, connected">From first booking to final checkout, keep your front desk, guests, and room data in one reliable flow.</Card>
      <Card number="02" icon="◌" title="Operations that flow">Turn daily room work into clear, assigned tasks so housekeeping and maintenance know what matters next.</Card>
      <Card number="03" icon="⌁" title="One view of your property">See occupancy, arrivals, room readiness, and team activity at a glance—without hunting through tabs.</Card>
    </div>
  );
}
