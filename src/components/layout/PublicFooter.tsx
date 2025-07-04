'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { FOOTER_LINKS, SITE_NAME, COMPANY_LEGAL_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '@/lib/constants';
import { Mail, Phone, MapPin } from 'lucide-react';
import NewsletterForm from './NewsletterForm';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 text-muted-foreground pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <Logo size="sm" className="mb-4"/>
            <p className="text-sm mb-4">
              {SITE_NAME} ofrece pólizas de garantía de alquiler integrales, proporcionando tranquilidad tanto a propietarios como a inquilinos.
            </p>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {CONTACT_EMAIL}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {CONTACT_PHONE}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Calle Segura 123, Ciudad de México, MX</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-headline font-semibold text-foreground mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.slice(0, Math.ceil(FOOTER_LINKS.length / 2)).map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-headline font-semibold text-foreground mb-4 md:mt-0 mt-8">Legal</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.slice(Math.ceil(FOOTER_LINKS.length / 2)).map((item) => (
                 <li key={item.label}>
                  <Link href={item.href} className="text-sm hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
               <li>
                  <Link href="/sitemap.xml" className="text-sm hover:text-primary transition-colors">
                    Mapa del Sitio
                  </Link>
                </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-headline font-semibold text-foreground mb-4">Boletín Informativo</h3>
            <p className="text-sm mb-3">Mantente actualizado con nuestras últimas noticias y ofertas.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center md:flex md:justify-between">
          <p className="text-sm">
            &copy; {currentYear} {COMPANY_LEGAL_NAME}. Todos los derechos reservados.
          </p>
          <p className="text-sm mt-2 md:mt-0">
            Hecho con ❤️ en la Ciudad de México.
          </p>
        </div>
      </div>
    </footer>
  );
}
