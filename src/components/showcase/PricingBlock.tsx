import { useState } from "react";
import { Check } from "lucide-react";

const plans = [
  {
    tier: "Consultation",
    monthly: "Free",
    yearly: "Free",
    desc: "Free case review for victims exploring their options.",
    features: [
      "30-minute case call",
      "On-chain analysis preview",
      "Fraud pattern check",
      "Recovery viability report",
      "Access to knowledge base",
    ],
  },
  {
    tier: "Standard",
    monthly: "€499/m",
    yearly: "€4,999/y",
    desc: "For individual victims pursuing structured recovery.",
    features: [
      "Losses up to €50,000",
      "Dedicated recovery agent",
      "Full chain-of-custody trace",
      "Exchange freeze requests",
      "Weekly case updates",
    ],
  },
  {
    tier: "Priority",
    monthly: "€1,499/m",
    yearly: "€14,999/y",
    desc: "For high-value losses and corporate cases.",
    pro: true,
    features: [
      "Unlimited loss value",
      "Senior agent + legal team",
      "Cross-jurisdiction filing",
      "24/7 case dashboard",
      "MFA-secured evidence vault",
    ],
  },
];

const PricingBlock = () => {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="c3-pricing-section">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="overlay" />
        </filter>
      </svg>

      <div className="c3-watermark-container">
        <div className="c3-watermark-main">
          <span className="c3-watermark-line-1">Your losses.</span>
          <span className="c3-watermark-line-2">Recovered.</span>
        </div>
      </div>

      <div className="c3-grid">
        {plans.map((p) => (
          <div key={p.tier} className={`c3-card ${p.pro ? "c3-card-pro" : ""}`}>
            <div className="c3-tier-small">{p.tier}</div>
            <div className="c3-tier-large">{yearly ? p.yearly : p.monthly}</div>
            <div className="c3-desc">{p.desc}</div>
            <ul className="c3-list">
              {p.features.map((f) => (
                <li key={f}>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className="c3-btn">Choose Plan</button>
          </div>
        ))}
      </div>

      <div className="c3-toggle-wrap">
        <span>Yearly</span>
        <button
          className={`c3-toggle ${yearly ? "active" : ""}`}
          onClick={() => setYearly((v) => !v)}
          aria-label="Toggle yearly pricing"
        >
          <span className="c3-toggle-knob" />
        </button>
      </div>
    </section>
  );
};

export default PricingBlock;
