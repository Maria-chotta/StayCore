import Header from "../../components/layout/Header";
import Hero from "../../components/layout/Hero";
import Features from "../../components/layout/Features";
import Footer from "../../components/layout/Footer";
import "./Home.css";

const outcomes = [["24/7", "one clear view of operations"], ["2.4x", "faster room turnover"], ["100%", "team visibility across every shift"]];

export default function Home() {
  return (
    <div className="home-root">
      <Header />

      <main>
        <Hero />

        <section className="proof-band" aria-label="StayCore outcomes"><p>Built for teams that keep hospitality moving</p><div className="outcomes">{outcomes.map(([stat, copy]) => <div key={stat}><strong>{stat}</strong><span>{copy}</span></div>)}</div></section>
        <Features />
        <section className="home-cta" id="demo"><span className="eyebrow">ONE PLATFORM, EVERY SHIFT</span><h2>Spend less time chasing updates. Spend more time with guests.</h2><p>StayCore brings your property, people, and daily priorities into one calm, connected workspace.</p><a className="button button-light" href="/login">Get started <span>→</span></a></section>
      </main>

      <Footer />
    </div>
  );
}
