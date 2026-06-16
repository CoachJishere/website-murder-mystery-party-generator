
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  if (isAuthenticated) {
    return null;
  }

  return (
    <footer className="py-12 px-4" style={{ backgroundColor: 'var(--color-black)' }}>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2 no-underline">
              <span style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                MYSTERY MAKER
              </span>
            </Link>
            <p style={{ color: 'var(--color-cream-muted)', fontFamily: 'var(--font-body)' }}>
              {t('footer.tagline')}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg" style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="footer-link">
                  {t('footer.links.home')}
                </Link>
              </li>
              <li>
                <Link to="/support" className="footer-link">
                  {t('footer.links.support')}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="footer-link">
                  {t('footer.links.blog')}
                </Link>
              </li>
              <li>
                <Link to="/custom-murder-mystery-party" className="footer-link">
                  {t('footer.links.customMystery', { defaultValue: 'Custom Murder Mystery' })}
                </Link>
              </li>
              <li>
                <Link to="/blog/murder-mystery-party-for-corporate-events/" className="footer-link">
                  {t('footer.links.corporateEvents', { defaultValue: 'Corporate & Office Events' })}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg" style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
              {t('footer.company')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/support" className="footer-link">
                  {t('footer.links.contact')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="footer-link">
                  {t('footer.links.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 flex flex-col md:flex-row justify-between items-center" style={{ borderTop: '1px solid var(--color-cream-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-cream-faint)', fontFamily: 'var(--font-body)' }}>
            &copy; {currentYear} Mystery Maker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
