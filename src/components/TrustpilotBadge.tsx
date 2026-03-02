import { useTranslation } from 'react-i18next';

const TRUSTPILOT_URL = "https://ca.trustpilot.com/review/mysterymaker.party";

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

      <img
        src="/images/trustpilot-stars.png"
        alt="5 stars"
        className="h-7 sm:h-8 w-auto"
      />

      <img
        src="/images/trustpilot-logo.svg"
        alt="Trustpilot"
        className="h-6 sm:h-7 w-auto"
      />
    </a>
  );
};

export default TrustpilotBadge;
