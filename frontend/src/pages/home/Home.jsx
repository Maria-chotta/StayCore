import { useEffect, useState } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import "./Home.css";

const images = {
  hero: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2200&q=92",
  lobby: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1500&q=92",
  room: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1500&q=92",
  coast: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=2200&q=92",
  resort: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=92",
  villa: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1800&q=92",
  suite: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=92",
};

const propertySlides = [
  {
    title: "Malindi Coast Retreat",
    location: "Malindi, Kenya",
    tag: "Oceanfront villas",
    summary: "Seamless guest journeys from arrival to checkout with premium service orchestration.",
    image: images.resort,
    stat: "98% occupancy",
  },
  {
    title: "Nairobi City Suites",
    location: "Nairobi, Kenya",
    tag: "Boutique city stays",
    summary: "Beautifully managed rooms, smart operations, and elevated guest experiences in one platform.",
    image: images.villa,
    stat: "12% revenue lift",
  },
  {
    title: "Mombasa Horizon Lodge",
    location: "Mombasa, Kenya",
    tag: "Resort operations",
    summary: "Built for hospitality teams that want faster operations, smoother check-ins, and stronger margins.",
    image: images.suite,
    stat: "4.8/5 guest rating",
  },
];

const roomRows = [
  ["204", "Deluxe King", "Ready", "ready"],
  ["118", "Garden Suite", "Cleaning", "cleaning"],
  ["306", "Twin Room", "Occupied", "occupied"],
];

function handleHeroPointerMove(event) {
  if (event.pointerType !== "mouse") return;

  const bounds = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
  const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  event.currentTarget.style.setProperty("--hero-mouse-x", `${x * 4}px`);
  event.currentTarget.style.setProperty("--hero-mouse-y", `${y * 4}px`);
  event.currentTarget.style.setProperty("--hero-ui-x", `${x * -7}px`);
  event.currentTarget.style.setProperty("--hero-ui-y", `${y * -7}px`);
}

function resetHeroPointer(event) {
  event.currentTarget.style.setProperty("--hero-mouse-x", "0px");
  event.currentTarget.style.setProperty("--hero-mouse-y", "0px");
  event.currentTarget.style.setProperty("--hero-ui-x", "0px");
  event.currentTarget.style.setProperty("--hero-ui-y", "0px");
}

function Dashboard({ dark = false }) {
  return (
    <div className={`dashboard-window ${dark ? "dashboard-window-dark" : ""}`}>
      <div className="dashboard-chrome"><span className="window-dots"><i /><i /><i /></span><strong>StayCore / Overview</strong><span>Tuesday, 24 June</span></div>
      <div className="dashboard-body">
        <aside className="dashboard-nav"><b>STAYCORE</b><span className="is-active">Overview</span><span>Reservations</span><span>Rooms</span><span>Guests</span><span>Operations</span><span>Billing</span><span>Reports</span></aside>
        <div className="dashboard-content">
          <div className="dashboard-heading"><div><small>GOOD MORNING, ALEX</small><h3>Today at a glance</h3></div><span className="dashboard-avatar">AK</span></div>
          <div className="dashboard-metrics"><div><small>OCCUPANCY</small><strong>82<span>%</span></strong><em>+6.4% this week</em></div><div><small>ARRIVALS</small><strong>12</strong><em>4 rooms ready</em></div><div><small>REVENUE</small><strong>TSh 4.58m</strong><em>+12.8% this week</em></div></div>
          <div className="dashboard-panels"><div className="occupancy-panel"><div className="panel-title"><b>Occupancy trend</b><span>Last 7 days</span></div><div className="sparkline"><i /><i /><i /><i /><i /><i /><i /><svg viewBox="0 0 420 150" preserveAspectRatio="none" aria-hidden="true"><path d="M4 126 C48 112 58 96 93 104 S143 85 175 92 S212 55 246 68 S290 42 320 57 S369 30 416 18" /></svg></div><div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div><div className="readiness-panel"><div className="panel-title"><b>Room readiness</b><span>View all</span></div>{roomRows.map(([number, type, status, tone]) => <div className="room-line" key={number}><strong>{number}</strong><span>{type}</span><em className={`status-${tone}`}>{status}</em></div>)}</div></div>
        </div>
      </div>
    </div>
  );
}

const connectedModules = [
  ["reservations", "01", "Reservations", "12 arrivals", "8 departures"],
  ["rooms", "02", "Rooms", "41 occupied", "7 available"],
  ["guests", "03", "Guests", "Sarah Johnson", "Confirmed · 2 nights"],
  ["housekeeping", "04", "Housekeeping", "4 ready", "2 cleaning"],
  ["maintenance", "05", "Maintenance", "0 urgent", "3 open"],
  ["billing", "06", "Billing", "TSh 4.58M", "Revenue this month"],
  ["reports", "07", "Reports", "82% occupancy", "+6.4% this week"],
];

function FeatureStaySlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % propertySlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="property-showcase" aria-label="Featured properties showcase">
      <div className="property-showcase-copy">
        <span className="home-kicker">FEATURED PROPERTIES</span>
        <h2>Luxury stays, <em>beautifully managed.</em></h2>
        <p>From beachfront resorts to boutique city properties, StayCore powers a smoother guest journey and a sharper operating rhythm.</p>
      </div>

      <div className="property-showcase-slider">
        <div className="property-slide-panel">
          {propertySlides.map((slide, index) => (
            <div className={`property-slide ${index === activeIndex ? "is-active" : ""}`} key={slide.title}>
              <img src={slide.image} alt={slide.title} />
              <div className="property-slide-overlay" />
              <div className="property-slide-content">
                <span className="property-chip">{slide.tag}</span>
                <h3>{slide.title}</h3>
                <small>{slide.location}</small>
                <p>{slide.summary}</p>
                <div className="property-slide-meta">
                  <strong>{slide.stat}</strong>
                  <button type="button" aria-label={`View ${slide.title}`}>Explore property</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="property-slider-controls" aria-label="Property carousel controls">
          {propertySlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${slide.title}`}
            >
              <span>{slide.location}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConnectedOperations() {
  return (
    <div className="connected-ecosystem" aria-label="StayCore connected hotel operations">
      <div className="ecosystem-line ecosystem-line-top"><i /><i /><i /></div>
      <div className="ecosystem-line ecosystem-line-bottom"><i /><i /><i /></div>
      <div className="ecosystem-line ecosystem-line-left"><i /><i /></div>
      <div className="ecosystem-line ecosystem-line-right"><i /><i /></div>
      {connectedModules.map(([kind, number, title, value, note]) => (
        <article className={`operation-module operation-module-${kind}`} key={kind}>
          <div className="module-heading"><span className={`module-glyph module-glyph-${kind}`}>{number}</span><small>{title}</small><b>↗</b></div>
          <strong>{value}</strong><span>{note}</span>
          {kind === "rooms" && <div className="module-bars"><i /><i /><i /><i /><i /></div>}
          {kind === "billing" && <div className="module-spark"><i /><i /><i /><i /><i /><i /></div>}
          {kind === "reports" && <div className="module-ring"><span>82</span></div>}
        </article>
      ))}
      <div className="ecosystem-core"><div className="core-mark"><span>S</span></div><span className="core-overline">ONE PLATFORM</span><strong>StayCore</strong><small>Hotel Operations</small><b className="core-live"><i /> LIVE PROPERTY DATA</b></div>
    </div>
  );
}

const arrivalRows = [
  ["204", "Sarah Johnson", "2 nights", "Confirmed", "ready"],
  ["108", "Michael Brown", "3 nights", "Confirmed", "ready"],
  ["315", "Amina Said", "1 night", "Pending payment", "pending"],
];

const hospitalityRoles = [
  {
    id: "frontdesk",
    name: "Front Desk",
    short: "Arrivals, departures and guest flow",
    description: "Keep check-ins, guest details and reservation updates in one shared view so the guest experience stays smooth from arrival to departure.",
    tasks: ["Arrivals", "Departures", "Guest details", "Live availability"],
    image: images.lobby,
  },
  {
    id: "housekeeping",
    name: "Housekeeping",
    short: "Room readiness and priority tracking",
    description: "Give teams a clear view of room status, urgent tasks and next actions so the property is ready before the next guest arrives.",
    tasks: ["Room status", "Priority tasks", "Inspections", "Turnover flow"],
    image: images.room,
  },
  {
    id: "management",
    name: "Hotel Management",
    short: "Revenue and operational visibility",
    description: "See occupancy, performance and daily movement in a single overview so leaders can respond before issues grow.",
    tasks: ["Occupancy", "Revenue view", "Operations", "Decision-ready data"],
    image: images.hero,
  },
  {
    id: "owner",
    name: "Property Owner",
    short: "Performance, margins and growth",
    description: "Give owners a cleaner operational picture with better visibility into guest experience, room movement and performance trends.",
    tasks: ["Performance", "Visibility", "Growth", "Fewer blind spots"],
    image: images.coast,
  },
];

const pricingTiers = [
  {
    name: "Essential",
    summary: "For small properties and guesthouses.",
    cta: "Get Started",
    tone: "standard",
    features: ["Reservations", "Guests", "Rooms", "Basic operations"],
  },
  {
    name: "Professional",
    summary: "For growing hotels and lodges.",
    cta: "Get Started",
    tone: "featured",
    badge: "MOST POPULAR",
    features: ["Everything in Essential", "Housekeeping", "Maintenance", "Billing & Folios", "Revenue intelligence", "Reports"],
  },
  {
    name: "Enterprise",
    summary: "For larger or multi-property hospitality businesses.",
    cta: "Contact StayCore",
    tone: "standard",
    features: ["Everything in Professional", "Advanced operational visibility", "Multi-property readiness", "Custom requirements", "Priority support"],
  },
];

function ReservationsPreview() {
  return (
    <div className="reservations-preview">
      <div className="reservation-preview-bar"><span className="window-dots"><i /><i /><i /></span><strong>StayCore / Reservations</strong><span>Today, 24 June</span></div>
      <div className="reservation-preview-body">
        <div className="reservation-preview-top"><div><small>FRONT DESK / TODAY</small><h3>Arrivals &amp; departures</h3></div><span className="reservation-count">12 <small>arrivals</small></span></div>
        <div className="reservation-summary"><div><span>ARRIVALS</span><strong>12</strong><b>4 rooms ready</b></div><div><span>DEPARTURES</span><strong>8</strong><b>2 folios open</b></div><div><span>AVAILABLE</span><strong>7</strong><b>of 54 rooms</b></div></div>
        <div className="arrival-heading"><b>Today&apos;s arrivals</b><span>Check-in window <strong>14:00—18:00</strong></span></div>
        <div className="arrival-list">{arrivalRows.map(([room, guest, nights, status, tone]) => <div className="arrival-row" key={room}><span className="arrival-room">{room}</span><div className="arrival-guest"><strong>{guest}</strong><small>{nights} · Check-in today</small></div><span className="arrival-status"><i className={`arrival-status-dot ${tone}`} />{status}</span><b className="arrival-more">···</b></div>)}</div>
        <div className="reservation-timeline"><div className="timeline-labels"><span>MON 23</span><span>TUE 24</span><span>WED 25</span><span>THU 26</span><span>FRI 27</span></div><div className="timeline-row"><strong>204</strong><span><i>Sarah Johnson</i></span></div><div className="timeline-row"><strong>108</strong><span className="timeline-row-long"><i>Michael Brown</i></span></div><div className="timeline-row"><strong>315</strong><span className="timeline-row-short"><i>Amina Said</i></span></div></div>
      </div>
    </div>
  );
}

function TrustProofSection() {
  return (
    <section className="trust-proof-section" aria-label="Trust and proof">
      <div className="section-intro trust-proof-intro">
        <span className="home-kicker">BUILT FOR HOSPITALITY</span>
        <h2>One platform.<br /><em>Every part of the stay.</em></h2>
      </div>

      <div className="trust-proof-diagram" aria-label="StayCore interconnected modules">
        <div className="trust-proof-core">
          <span>StayCore</span>
        </div>

        <div className="trust-proof-node trust-proof-node-top-left">Reservations</div>
        <div className="trust-proof-node trust-proof-node-top">Rooms</div>
        <div className="trust-proof-node trust-proof-node-top-right">Guests</div>
        <div className="trust-proof-node trust-proof-node-left">Housekeeping</div>
        <div className="trust-proof-node trust-proof-node-right">Maintenance</div>
        <div className="trust-proof-node trust-proof-node-bottom-left">Billing</div>
        <div className="trust-proof-node trust-proof-node-bottom-right">Reports</div>

        <div className="trust-proof-ring trust-proof-ring-outer" />
        <div className="trust-proof-ring trust-proof-ring-inner" />

        <div className="trust-proof-meta">
          <span>Connected operations</span>
          <span>Real-time visibility</span>
          <span>Smarter decisions</span>
        </div>
      </div>
    </section>
  );
}

function HospitalityStoriesSection() {
  const [activeRole, setActiveRole] = useState(hospitalityRoles[0].id);
  const selectedRole = hospitalityRoles.find((role) => role.id === activeRole) || hospitalityRoles[0];

  return (
    <section className="hospitality-stories-section" aria-label="Hospitality stories by role">
      <div className="story-header">
        <span className="home-kicker">DESIGNED AROUND YOUR TEAM</span>
        <h2>Everyone sees the stay differently.<br /><em>StayCore connects the view.</em></h2>
      </div>

      <div className="story-layout">
        <div className="story-role-list" aria-label="Hospitality role stories">
          {hospitalityRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`story-role ${activeRole === role.id ? "is-active" : ""}`}
              onClick={() => setActiveRole(role.id)}
            >
              <span>{role.name}</span>
              <small>{role.short}</small>
            </button>
          ))}
        </div>

        <div className="story-preview">
          <div className="story-preview-image-wrap">
            <img src={selectedRole.image} alt={selectedRole.name} />
            <div className="story-preview-badge">{selectedRole.name}</div>
          </div>

          <div className="story-preview-copy">
            <div className="story-preview-header">
              <span>{selectedRole.name}</span>
              <b>{selectedRole.short}</b>
            </div>
            <p>{selectedRole.description}</p>
            <ul>
              {selectedRole.tasks.map((task) => <li key={task}>{task}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="pricing-section" aria-label="StayCore pricing plans">
      <div className="pricing-header">
        <span className="home-kicker">SIMPLE, FLEXIBLE PLANS</span>
        <h2>Choose the setup that fits your property.</h2>
        <p>Start with the tools you need today and grow into a more connected operation.</p>
      </div>

      <div className="pricing-grid">
        {pricingTiers.map((tier) => (
          <article key={tier.name} className={`pricing-card ${tier.tone === "featured" ? "is-featured" : ""}`}>
            {tier.badge && <span className="pricing-badge">{tier.badge}</span>}
            <div className="pricing-card-header">
              <span>{tier.name}</span>
              <small>{tier.summary}</small>
            </div>

            <div className="pricing-card-body">
              <div className="pricing-cta-row">
                <strong>Talk to us</strong>
                <span>Flexible setup</span>
              </div>

              <ul>
                {tier.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </div>

            <button type="button" className="pricing-button">{tier.cta}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="home-root">
      <Header />
      <main>
        <section className="hero-scene" id="platform" onPointerMove={handleHeroPointerMove} onPointerLeave={resetHeroPointer}>
          <img className="hero-scene-image" src={images.hero} alt="Infinity pool at a tropical hotel overlooking the ocean" />
          <div className="hero-scene-shade" />
          <div className="hero-copy"><span className="home-kicker">STAYCORE / HOTEL OPERATING SYSTEM</span><h1>Run your entire hotel.<br /><em>Beautifully.</em></h1><p>Reservations, rooms, guests, housekeeping, maintenance, billing and reporting, connected in one intelligent platform.</p><div className="hero-actions"><a className="home-button home-button-light" href="/login">Start free trial <span>↗</span></a><a className="hero-text-link" href="#loop">Explore StayCore <span>↓</span></a></div></div>
          <div className="hero-product"><div className="hero-product-label"><span>LIVE PROPERTY VIEW</span><b>STAYCORE OS</b></div><Dashboard /><div className="hero-notification hero-notification-top"><span className="notification-mark">✓</span><span><small>Housekeeping</small><strong>4 rooms ready</strong></span><b>Now</b></div><div className="hero-notification hero-notification-bottom"><span className="notification-mark notification-mark-warm">↗</span><span><small>New reservation</small><strong>Room 204 · Check-in today</strong></span><b>14:30</b></div><div className="hero-notification hero-notification-side"><span className="notification-mark notification-mark-warm">$</span><span><small>Payment received</small><strong>TSh 450,000</strong></span></div><div className="hero-notification hero-notification-guest"><span className="notification-mark notification-mark-blue">SJ</span><span><small>Guest confirmed</small><strong>Sarah Johnson · 2 nights</strong></span></div></div>
          <div className="hero-caption"><span>INDIAN OCEAN / 06:42</span><span>BUILT FOR THE PEOPLE BEHIND THE STAY</span></div>
        </section>

        <section className="value-rail"><div><span>ONE PROPERTY</span><strong>ONE SOURCE OF TRUTH</strong></div><div><span>LIVE OPERATIONS</span><strong>EVERY SHIFT, ALIGNED</strong></div><div><span>BETTER EXPERIENCES</span><strong>MORE TIME FOR GUESTS</strong></div></section>

        <FeatureStaySlider />

        <section className="loop-section connected-operations-section" id="loop"><div className="section-intro"><span className="home-kicker">ONE PLATFORM. EVERY OPERATION.</span><h2>Everything your property needs.<br /><em>Connected.</em></h2><p>StayCore brings reservations, rooms, guests, housekeeping, maintenance, billing and reporting into one intelligent operating system.</p></div><ConnectedOperations /><div className="loop-note"><span>ONE HOTEL / ONE PICTURE</span><p>When every team works from the same live property data, nothing gets lost between the booking and the stay.</p></div></section>

        <section className="dark-product-section"><div className="dark-product-heading"><span className="home-kicker">THE CONTROL ROOM</span><h2>One property.<br /><em>One clear picture.</em></h2><p>Designed around the way hotel teams actually work: quickly, together, and close to the guest.</p></div><div className="dark-dashboard-wrap"><Dashboard dark /><div className="dark-pulse"><span />Live property data</div></div><div className="dark-module-list"><span>RESERVATIONS</span><span>ROOMS</span><span>GUESTS</span><span>HOUSEKEEPING</span><span>MAINTENANCE</span><span>BILLING</span><span>REPORTS</span></div></section>

        <section className="reservations-story" id="reservations"><div className="reservations-visual"><img src={images.lobby} alt="Warm modern hotel reception with a concierge desk" /><div className="reservations-visual-shade" /><div className="reservation-interface"><ReservationsPreview /><div className="reservation-float reservation-float-new"><span className="reservation-float-icon">↗</span><span><small>New reservation</small><strong>Room 204 · Confirmed</strong></span></div><div className="reservation-float reservation-float-checkin"><span className="reservation-float-icon reservation-float-icon-warm">14</span><span><small>Check-in</small><strong>Today · 14:00</strong></span></div><div className="reservation-float reservation-float-ready"><span className="reservation-float-icon reservation-float-icon-green">✓</span><span><small>Room 108</small><strong>Ready</strong></span></div></div></div><div className="reservations-copy"><span className="home-kicker">SMART RESERVATIONS</span><h2>Every arrival starts<br /><em>with clarity.</em></h2><p>Manage reservations, availability, arrivals and departures from one beautifully connected workspace.</p><div className="reservation-highlights"><span><b>✓</b> Real-time availability</span><span><b>✓</b> Faster check-ins</span><span><b>✓</b> Centralized reservations</span></div><a className="editorial-link" href="/login">Explore reservations <span>↗</span></a></div></section>

        <section className="hotel-operations-section" aria-label="Hotel operations overview">
          <div className="hotel-operations-copy">
            <span className="home-kicker">HOTEL OPERATIONS</span>
            <h2>Keep every room<br /><em>moving.</em></h2>
            <p>From housekeeping to maintenance, StayCore gives your team one clear view of what needs attention, what is being handled, and what is ready for the next guest.</p>
            <div className="hotel-operations-flow" aria-label="Room status flow from housekeeping to maintenance to ready for guest">
              <span>ROOM STATUS</span>
              <span className="flow-arrow">↓</span>
              <span>HOUSEKEEPING</span>
              <span className="flow-arrow">↓</span>
              <span>MAINTENANCE</span>
              <span className="flow-arrow">↓</span>
              <span>READY FOR GUEST</span>
            </div>
          </div>

          <div className="hotel-operations-visual">
            <img src={images.room} alt="Luxury hotel room prepared for a guest" />
            <div className="hotel-operations-visual-shade" />

            <div className="hotel-housekeeping-panel">
              <div className="ops-window-header">
                <span className="window-dots"><i /><i /><i /></span>
                <strong>StayCore / Housekeeping</strong>
              </div>
              <div className="ops-window-body">
                {roomRows.map(([number, type, status, tone]) => (
                  <div className={`ops-room-row ${tone}`} key={number}>
                    <div className="ops-room-meta">
                      <strong>{number}</strong>
                      <span>{type}</span>
                    </div>
                    <em className={`ops-status ${tone}`}>{status}</em>
                  </div>
                ))}
              </div>
              <div className="ops-task-summary">
                <small>Housekeeping task assigned</small>
                <strong>Final inspection · Mia T.</strong>
                <div className="ops-task-meta">
                  <span>Priority <b>High</b></span>
                  <span>Due <b>15:30</b></span>
                </div>
              </div>
            </div>

            <div className="hotel-maintenance-panel">
              <div className="maintenance-panel-header">
                <span className="panel-kicker">Maintenance</span>
                <span className="panel-tag">Issue reported</span>
              </div>
              <div className="maintenance-panel-body">
                <div className="maintenance-room">
                  <strong>Room 118</strong>
                  <span>Garden Suite</span>
                </div>
                <div className="maintenance-detail">
                  <small>Issue</small>
                  <b>Bathroom fan noise</b>
                </div>
                <div className="maintenance-meta">
                  <div><small>Priority</small><strong className="priority-high">High</strong></div>
                  <div><small>Assigned</small><strong>Lee M.</strong></div>
                </div>
              </div>
            </div>

            <div className="ops-ready-badge">
              <span className="status-check">✓</span>
              <div>
                <small>Room ready notification</small>
                <strong>Room 204 · Ready for guest</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="revenue-intelligence-section" aria-label="Revenue intelligence overview">
          <div className="revenue-intelligence-header">
            <span className="home-kicker">REVENUE INTELLIGENCE</span>
            <h2>Turn every stay into<br /><em>smarter revenue.</em></h2>
            <p>StayCore brings bookings, guest activity, folios and payments into one clear financial view so managers can spot opportunity before it slips away.</p>
          </div>

          <div className="revenue-intelligence-layout">
            <div className="revenue-chart-panel">
              <div className="chart-panel-header">
                <div>
                  <small>ROOMS · FOOD · SERVICES</small>
                  <strong>Revenue performance</strong>
                </div>
                <span>Live</span>
              </div>

              <div className="chart-panel-body">
                <svg viewBox="0 0 640 260" role="img" aria-label="Monthly revenue trend">
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(239,170,126,0.38)" />
                      <stop offset="100%" stopColor="rgba(239,170,126,0.02)" />
                    </linearGradient>
                  </defs>
                  <path d="M20 190 C110 168, 150 144, 210 152 S320 88, 370 126 S470 82, 560 60 L560 220 L20 220 Z" fill="url(#revenueFill)" opacity="0.9" />
                  <path d="M20 190 C110 168, 150 144, 210 152 S320 88, 370 126 S470 82, 560 60" fill="none" stroke="#efaa7e" strokeWidth="4" strokeLinecap="round" />
                  <g className="chart-points">
                    <circle cx="20" cy="190" r="5" />
                    <circle cx="210" cy="152" r="5" />
                    <circle cx="370" cy="126" r="5" />
                    <circle cx="560" cy="60" r="5" />
                  </g>
                </svg>
              </div>

              <div className="chart-axis">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>

            <aside className="revenue-insight-panel" aria-label="Revenue insight panel">
              <div className="insight-kicker">Today</div>
              <div className="insight-figure">
                <span>Revenue</span>
                <strong>TSh 8.42M</strong>
                <em>+18.4% vs last month</em>
              </div>

              <div className="insight-stats">
                <div>
                  <small>ADR</small>
                  <strong>TSh 185k</strong>
                </div>
                <div>
                  <small>RevPAR</small>
                  <strong>TSh 142k</strong>
                </div>
                <div>
                  <small>Collections</small>
                  <strong>94.2%</strong>
                </div>
                <div>
                  <small>Open folios</small>
                  <strong>17</strong>
                </div>
              </div>

              <div className="insight-streams">
                <span>Reservations</span>
                <span>Stays</span>
                <span>Folios</span>
                <span>Payments</span>
                <span>Revenue</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="why-staycore-section" aria-label="Why StayCore">
          <div className="why-staycore-copy">
            <span className="home-kicker">WHY STAYCORE</span>
            <h2>One core for the<br /><em>entire stay.</em></h2>
            <p>StayCore brings hotel operations, guest experiences and revenue intelligence into one connected system so teams can move faster and guests feel the difference.</p>
            <div className="why-proof-grid">
              <div>
                <span>FRONT DESK</span>
                <strong>Arrivals, departures and guest communication stay aligned.</strong>
              </div>
              <div>
                <span>OPERATIONS</span>
                <strong>Housekeeping and maintenance move in sync with room readiness.</strong>
              </div>
              <div>
                <span>REVENUE</span>
                <strong>Billing, folios and payment performance stay visible in real time.</strong>
              </div>
            </div>
          </div>

          <div className="why-staycore-visual" aria-label="StayCore connected hotel operations visual">
            <div className="why-system-center">
              <span>STAYCORE</span>
              <strong>One operating core</strong>
            </div>
            <div className="system-node reservations-node">Reservations</div>
            <div className="system-node guests-node">Guests</div>
            <div className="system-node rooms-node">Rooms</div>
            <div className="system-node housekeeping-node">Housekeeping</div>
            <div className="system-node maintenance-node">Maintenance</div>
            <div className="system-node billing-node">Billing</div>
            <div className="system-path path-1" />
            <div className="system-path path-2" />
            <div className="system-path path-3" />
            <div className="system-path path-4" />
            <div className="system-path path-5" />
            <div className="system-path path-6" />
          </div>
        </section>

        <TrustProofSection />
        <HospitalityStoriesSection />
        <PricingSection />

        <section className="final-cta-section" id="demo">
          <img src={images.coast} alt="Luxury resort terrace at sunset" />
          <div className="final-cta-shade" />
          <div className="final-cta-content">
            <span className="home-kicker">READY TO RUN A SMARTER HOTEL?</span>
            <h2>Your hotel deserves<br /><em>a better core.</em></h2>
            <p>Bring reservations, guests, rooms, operations and revenue together with StayCore.</p>
            <div className="final-cta-actions">
              <a className="home-button home-button-light" href="/login">Get started <span>↗</span></a>
              <a className="hero-text-link" href="#platform">Explore StayCore <span>↓</span></a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}