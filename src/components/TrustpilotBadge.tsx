import { useTranslation } from 'react-i18next';

const TRUSTPILOT_URL = "https://ca.trustpilot.com/review/mysterymaker.party";
const TRUSTPILOT_GREEN = "#00b67a";

const TrustpilotStar = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="2" fill={TRUSTPILOT_GREEN} />
    <path
      d="M16 6l2.94 6.34L26 13.13l-5 5.12L22.18 26 16 22.27 9.82 26 11 18.25l-5-5.12 7.06-.79L16 6z"
      fill="white"
    />
  </svg>
);

const TrustpilotBadge = () => {
  const { t } = useTranslation();

  return (
    <a
      href={TRUSTPILOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 sm:gap-4 py-3 no-underline transition-opacity hover:opacity-80"
      aria-label={t('trustpilot.ariaLabel')}
    >
      <span className="text-muted-foreground text-sm sm:text-base font-inter">
        {t('trustpilot.customersSay')}
      </span>

      <span className="text-foreground text-lg sm:text-xl font-bold font-inter">
        {t('trustpilot.excellent')}
      </span>

      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <TrustpilotStar key={i} />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill={TRUSTPILOT_GREEN}>
          <path d="M12 .587l3.668 7.431 8.332 1.151-6.064 5.828 1.48 8.279L12 19.187l-7.416 4.089 1.48-8.279L0 9.169l8.332-1.151z" />
        </svg>
        <span className="text-foreground text-base sm:text-lg font-bold font-inter">
          Trustpilot
        </span>
      </div>
    </a>
  );
};

export default TrustpilotBadge;
