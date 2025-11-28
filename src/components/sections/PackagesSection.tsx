'use client';

import { PackageCard } from '@/components/shared/PackageCard';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc/client';
import type { Package } from '@/lib/types';

export function PackagesSection() {
  // Use tRPC to fetch packages
  const { data: packages = [], isLoading: loading, error } = trpc.package.getAll.useQuery();

  if (loading) {
    return (
      <Section id="packages" aria-labelledby="packages-title" className="bg-muted/30">
        <PageTitle title={t.pages.home.packagesTitle} subtitle={t.pages.home.packagesSubtitle} titleClassName="text-foreground" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </Section>
    );
  }

  if (error) {
    return (
      <Section id="packages" aria-labelledby="packages-title" className="bg-muted/30">
        <PageTitle title={t.pages.home.packagesTitle} subtitle={t.pages.home.packagesSubtitle} titleClassName="text-foreground" />
        <div className="text-center text-muted-foreground">
          <p>Unable to load packages at this time. Please try again later.</p>
        </div>
      </Section>
    );
  }

  return (
    <Section id="packages" aria-labelledby="packages-title" className="bg-muted/30">
      <PageTitle title={t.pages.home.packagesTitle} subtitle={t.pages.home.packagesSubtitle} titleClassName="text-foreground" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        {packages.toSorted((a, b) => a.price - b.price).map((pkg) => (
          <PackageCard key={pkg.id} packageItem={pkg} />
        ))}
      </div>
    </Section>
  );
}
