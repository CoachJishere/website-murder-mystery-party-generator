import { useTranslation } from 'react-i18next';

const TRUSTPILOT_URL = "https://ca.trustpilot.com/review/mysterymaker.party";
const TRUSTPILOT_GREEN = "#00b67a";

const TrustpilotBadge = () => {
  const { t } = useTranslation();

  return (
    <a
      href={TRUSTPILOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground transition-colors no-underline group"
      aria-label={t('trustpilot.ariaLabel')}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <svg
            key={i}
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill={TRUSTPILOT_GREEN}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs sm:text-sm font-inter group-hover:underline">
        {t('trustpilot.linkText')}
      </span>
    </a>
  );
};

export default TrustpilotBadge;
