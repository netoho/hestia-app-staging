'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { t } from '@/lib/i18n';
import { Mail, Phone, MapPin } from 'lucide-react';
import NewsletterForm from './NewsletterForm';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 text-muted-foreground pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Logo size="lg" className="mb-4"/>
            <p className="text-sm mb-4">
              {t.layout.publicFooter.description}
            </p>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {t.contactEmail}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {t.contactPhone}</p>
              <p className="flex items-center gap-2"><MapPin className="h-16 w-16 sm:h-8 sm:w-8 text-primary" /> {t.layout.publicFooter.address}</p>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-headline font-bold text-foreground mb-4">{t.layout.publicFooter.quickLinks}</h3>
            <ul className="space-y-2">
              {t.layout.publicHeader.navLinks.slice(0, 4).map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-headline font-bold text-foreground mb-4 md:mt-0 mt-8">{t.layout.publicFooter.legal}</h3>
            <ul className="space-y-2">
              {t.layout.publicFooter.footerLinks.map((item) => (
                 <li key={item.label}>
                  <Link href={item.href} className="text-sm hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
               {/* <li> */}
               {/*    <Link href="/sitemap.xml" className="text-sm hover:text-primary transition-colors"> */}
               {/*      {t.layout.publicFooter.sitemap} */}
               {/*    </Link> */}
               {/* </li> */}
            </ul>
          </div>
          
          {/* <div> */}
          {/*   <h3 className="text-2xl font-headline font-bold text-foreground mb-4">{t.layout.publicFooter.newsletter}</h3> */}
          {/*   <p className="text-sm mb-3">{t.layout.publicFooter.newsletterDescription}</p> */}
          {/*   <NewsletterForm /> */}
          {/* </div> */}
        </div>

        <div className="border-t border-border pt-8 text-center md:flex md:justify-between">
          <p className="text-sm">
            &copy; {currentYear} {t.companyLegalName}. {t.layout.publicFooter.copyright}
          </p>
          <p className="text-sm mt-2 md:mt-0">
            {t.layout.publicFooter.madeWithLove}
          </p>
        </div>
      </div>
    </footer>
  );
}
