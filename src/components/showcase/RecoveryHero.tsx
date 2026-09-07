import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  FileSearch,
  FileText,
  Fingerprint,
  FolderOpen,
  GitBranch,
  Layers3,
  ListChecks,
  Route,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { recoveryHeroCopy } from '@/i18n/recoveryHero';
import { cn } from '@/lib/utils';

const stageIcons = [FolderOpen, GitBranch, Route];
const documentIcons = [FileText, FileSearch, ListChecks];
const itemIcons = [FileText, Wallet, Layers3];

const RecoveryHero = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const copy = recoveryHeroCopy[language];
  const [activeStage, setActiveStage] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const reduceMotion = useReducedMotion();
  const stage = copy.stages[activeStage];
  const DocumentIcon = documentIcons[activeStage];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % copy.stages.length;
    else if (event.key === 'ArrowLeft') next = (index + copy.stages.length - 1) % copy.stages.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = copy.stages.length - 1;
    else return;

    event.preventDefault();
    setActiveStage(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="recovery" aria-labelledby="recovery-title" className="showcase-anchor recovery-hero w-full px-4 pb-4 pt-24 sm:px-6 lg:px-8 lg:pt-28">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-white/10 pb-5 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
        <span className="inline-flex items-center gap-2.5 text-neutral-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" aria-hidden="true" />
          {copy.eyebrow}
        </span>
        <span className="inline-flex items-center gap-2.5">
          <Fingerprint className="h-4 w-4" aria-hidden="true" />
          {copy.service}
        </span>
      </div>

      <div className="grid items-center gap-7 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10 xl:py-12">
        <h1 id="recovery-title" className="showcase-display-title recovery-hero-title min-w-0">
          <span className="block text-white">{copy.title[0]}</span>
          <span className="recovery-hero-accent block">{copy.title[1]}</span>
        </h1>

        <div className="min-w-0">
          <p className="text-base leading-relaxed text-neutral-300 lg:text-lg">{copy.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to={user ? '/dashboard' : '/auth'}
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
            >
              {user ? t('hero.goToDashboard') : copy.start}
              <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <a
              href="#recovery-process"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              {copy.explore}
              <ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-neutral-400">{copy.note}</p>
        </div>
      </div>

      <div id="recovery-process" className="showcase-anchor overflow-hidden rounded-2xl border border-white/15 bg-[#0d0f0e]">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-5 pt-6 sm:px-7">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200/80">{copy.process}</p>
            <h2 className="mt-2 text-lg font-medium tracking-tight text-white sm:text-xl">{copy.processTitle}</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-neutral-400">
            <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.overview}
          </span>
        </div>

        <div role="tablist" aria-label={copy.process} className="grid grid-cols-3 border-y border-white/10">
          {copy.stages.map((item, index) => {
            const Icon = stageIcons[index];
            const selected = activeStage === index;

            return (
              <button
                key={index}
                ref={(element) => { tabs.current[index] = element; }}
                id={`${id}-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-panel-${index}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveStage(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'relative flex min-w-0 flex-col items-start justify-center gap-2 px-3 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-200 sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-7 sm:py-5',
                  index > 0 && 'border-l border-white/10',
                  selected ? 'bg-white/[0.065] text-white' : 'text-neutral-400 hover:bg-white/[0.025] hover:text-white',
                )}
              >
                <span className={cn('text-xs tabular-nums', selected ? 'text-emerald-200' : 'text-neutral-500')}>0{index + 1}</span>
                <Icon className="hidden h-4 w-4 shrink-0 lg:block" aria-hidden="true" />
                <span className="min-w-0 break-words text-xs font-medium leading-snug sm:text-sm lg:text-base">{item.label}</span>
                <ArrowUpRight className={cn('ml-auto hidden h-4 w-4 shrink-0 sm:block', selected ? 'text-emerald-200' : 'text-neutral-600')} aria-hidden="true" />
                {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-200" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {copy.stages.map((item, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={activeStage !== index}
            tabIndex={0}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-200"
          >
            {activeStage === index && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
              >
                <div className="flex min-w-0 flex-col justify-between gap-6 p-5 sm:p-7">
                  <div>
                    <h3 className="text-2xl font-medium tracking-tight text-white">{item.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400 sm:text-base">{item.description}</p>
                  </div>
                  <div className="flex items-start gap-3 border-t border-white/10 pt-5">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">{copy.outcome}</p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-200">{item.outcome}</p>
                    </div>
                  </div>
                </div>

                <div className="relative min-w-0 border-t border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:border-l lg:border-t-0">
                  <div className="recovery-brief relative rounded-xl bg-[#e5ebe7] p-5 text-[#18251e] sm:p-6">
                    <div className="flex items-start justify-between gap-4 border-b border-black/15 pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <DocumentIcon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <h4 className="text-sm font-semibold">{stage.document}</h4>
                      </div>
                      <span className="text-xs tabular-nums text-[#18251e]/60" aria-hidden="true">0{activeStage + 1} / 03</span>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {stage.items.map((label, itemIndex) => {
                        const ItemIcon = itemIcons[itemIndex];
                        return (
                          <li key={label} className="flex items-start gap-3 text-sm leading-relaxed">
                            <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#365344]" strokeWidth={1.5} aria-hidden="true" />
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecoveryHero;
