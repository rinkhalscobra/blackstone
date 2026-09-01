const Star = ({ fill = 1 }: { fill?: number }) => {
  const id = `tp-half-${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#00B67A" />
          <stop offset={`${fill * 100}%`} stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" fill={fill === 1 ? "#00B67A" : fill === 0 ? "#00B67A" : `url(#${id})`} />
      <path
        d="M12 3.5l2.35 5.36 5.85.5-4.43 3.83 1.34 5.71L12 15.9l-5.11 3l1.34-5.71L3.8 9.36l5.85-.5L12 3.5z"
        fill="#ffffff"
      />
    </svg>
  );
};

const TrustpilotBadge = () => (
  <div className="inline-flex items-center gap-2 sm:gap-3 bg-white rounded-[4px] pl-2 pr-3 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow duration-300">
    <div className="flex items-center gap-0.5">
      <Star fill={1} />
      <Star fill={1} />
      <Star fill={1} />
      <Star fill={1} />
      <Star fill={0.5} />
    </div>
    <div className="flex flex-col leading-tight">
      <span className="text-[13px] sm:text-[14px] font-medium text-gray-900">Trustpilot</span>
      <span className="text-[10px] sm:text-[11px] text-gray-500">4.5 · 1,240 reviews</span>
    </div>
  </div>
);

export default TrustpilotBadge;
