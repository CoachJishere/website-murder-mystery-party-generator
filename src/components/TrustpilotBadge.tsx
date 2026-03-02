import { useTranslation } from 'react-i18next';

const TRUSTPILOT_URL = "https://ca.trustpilot.com/review/mysterymaker.party";

const TrustpilotBadge = () => {
  const { t } = useTranslation();

  return (
    <a
      href={TRUSTPILOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block transition-opacity hover:opacity-80"
      aria-label={t('trustpilot.ariaLabel')}
    >
      <img
        src="/images/trustpilot-badge.png"
        alt={t('trustpilot.linkText')}
        className="h-10 sm:h-12 w-auto"
      />
    </a>
  );
};

export default TrustpilotBadge;
