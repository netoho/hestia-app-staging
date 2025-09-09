import Link from 'next/link';
import type { Package } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface PackageCardProps {
  packageItem: Package;
}

interface FeatureCategory {
  title: string;
  items: string[];
}

export function PackageCard({ packageItem }: PackageCardProps) {
  // Parse features JSON string into categories
  const parsedFeatures = JSON.parse(packageItem.features);
  let featureCategories: FeatureCategory[] = Object.entries(parsedFeatures).map(([title, items]) => ({
        title,
        items: items as string[]
      }))

  // Determine styling based on package ID
  const isPremium = packageItem.id === 'premium';
  const isStandard = packageItem.id === 'standard';
  const isBasic = packageItem.id === 'basic';

  // Card background classes
  const cardClasses = cn(
    "flex flex-col h-full rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300",
    {
      "bg-primary text-white": isPremium,
      "bg-gray-100": isStandard,
      "bg-card": isBasic,
    }
  );

  // Text color classes for different elements
  const titleClasses = cn(
    "font-display",
    {
      "text-white": isPremium,
      "text-foreground": !isPremium,
      "text-6xl": !packageItem.percentage,
      "text-4xl": packageItem.percentage,
    }
  );

  const percentageClasses = cn(
    "text-5xl font-bold font-display",
    {
      "text-white": isPremium,
      "text-primary": !isPremium,
    }
  );

  const subtitleClasses = cn(
    "text-sm mt-1",
    {
      "text-white/90": isPremium,
      "text-muted-foreground": !isPremium,
    }
  );

  const categoryTitleClasses = cn(
    "font-semibold text-md uppercase tracking-wide mb-3 text-center underline",
    {
      "text-white": isPremium,
      "text-primary": !isPremium,
    }
  );

  const featureTextClasses = cn(
    "text-sm",
    {
      "text-white/90": isPremium,
      "text-foreground/90": !isPremium,
    }
  );

  const descriptionClasses = cn(
    "text-sm text-center w-full",
    {
      "text-white/80": isPremium,
      "text-muted-foreground": !isPremium,
    }
  );

  const checkIconClasses = cn(
    "h-4 w-4 mr-2 shrink-0 mt-0.5",
    {
      "text-white": isPremium,
      "text-green-500": !isPremium,
    }
  );

  const buttonClasses = cn(
    "w-full text-lg py-6",
    {
      "bg-white hover:bg-gray-100 text-primary": isPremium,
      "bg-primary hover:bg-primary/90 text-primary-foreground": isStandard,
      "bg-accent hover:bg-accent/90 text-accent-foreground": isBasic,
    }
  );

  return (
    <Card className={cardClasses}>
      <CardHeader className="pb-4 text-center">
        {/* Percentage display for non-flat-fee packages */}
        {packageItem.percentage ? (
          <div className="mb-4">
            <p className={percentageClasses}>
              {packageItem.percentage}%
            </p>
            <p className={subtitleClasses}>
              Del valor de la Renta + IVA
            </p>
          </div>
        ) : null}
        
        <CardTitle className={titleClasses}>{packageItem.name}</CardTitle>
        
        {packageItem.minAmount && (
          <>
            <p className={cn("text-lg font-bold mt-2 font-body", isPremium ? "text-white" : "")}>
              Monto mínimo
            </p>
            <p className={cn("text-lg font-bold mt-2 font-display", isPremium ? "text-white" : "")}>
              ${packageItem.minAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </>
        )}

        {(!packageItem.percentage) && (
          <>
            <br />
            <p className={cn("text-2xl font-bold mt-2 font-display", isPremium ? "text-white" : "")}>
              ${packageItem.price.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} + IVA
            </p>
          </>
        )}

        {packageItem.shortDescription && (
          <CardDescription className={cn("text-base mt-3 italic", isPremium ? "text-white/80" : "")}>
            {packageItem.shortDescription}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-6 p-12">
          {featureCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {category.title && (
                <h4 className={categoryTitleClasses}>
                  {category.title}
                </h4>
              )}
              <ul className="space-y-2">
                {category.items.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className={checkIconClasses} />
                    <span className={featureTextClasses}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="mt-auto pt-4 flex flex-col gap-4">
        {packageItem.description && (
          <p className={descriptionClasses}>
            {packageItem.description}
          </p>
        )}
        
        <Button asChild className={buttonClasses}>
          <Link href={packageItem.ctaLink}>{packageItem.ctaText ?? t.actions.learnMore}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}