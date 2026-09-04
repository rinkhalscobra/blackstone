const items = [
  {
    quote:
      "I lost 1.8 BTC to a fake broker and had written it off. BrightFund Recovery traced it in 11 days and recovered 74%. I still can't quite believe it.",
    name: "Parker Wilf",
    role: "Recovered client, Bitcoin case",
    company: "€92,400 RECOVERED",
  },
  {
    quote:
      "The chain-of-custody dossier they produced was court-ready. My firm has represented three of their cases and won every one.",
    name: "Andrew von Rosenbach",
    role: "Partner, Digital Assets Practice",
    company: "ROSENBACH LEGAL",
  },
  {
    quote:
      "Their AI triage caught a rug-pull cluster we would have missed. The freeze request went out in under an hour.",
    name: "Mathies Christensen",
    role: "Head of Compliance",
    company: "NORDIC EXCHANGE",
  },
];

const Testimonials = () => (
  <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 relative z-10">
    <div className="grid md:grid-cols-3 gap-6">
      {items.map((t) => (
        <figure key={t.name} className="liquid-glass rounded-2xl p-6">
          <blockquote className="text-sm text-white/80 leading-[1.6]">"{t.quote}"</blockquote>
          <figcaption className="mt-6 pt-5 border-t border-white/10">
            <div className="text-sm font-semibold text-white">{t.name}</div>
            <div className="text-xs text-white/50">{t.role}</div>
            <div className="text-xs text-white font-semibold tracking-wide mt-1">{t.company}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export default Testimonials;
