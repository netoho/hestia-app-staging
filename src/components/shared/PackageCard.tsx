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

          // <div className="mb-4">
          //   <p className="text-5xl font-bold text-primary">
          //     ${packageItem.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + IVA
          //   </p>
          // </div>

  return (
    <Card className={cn(
      "flex flex-col h-full rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300",
      packageItem.highlight ? "border-2 border-primary bg-primary/5" : "bg-card"
    )}>
      <CardHeader className="pb-4 text-center">
        {/* Percentage display for non-flat-fee packages */}
        {packageItem.percentage ? (
          <div className="mb-4">
            <p className="text-5xl font-bold text-primary">
              {packageItem.percentage}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Del valor de la Renta + IVA
            </p>
          </div>
        ) : null}
        

        {(!packageItem.percentage) ? (
          <CardTitle className="font-headline text-6xl text-foreground">{packageItem.name}</CardTitle>
        ) : (
          <CardTitle className="font-headline text-4xl text-foreground">{packageItem.name}</CardTitle>
          )
        }
        
        {packageItem.minAmount && (
          <>
            <p className="text-lg font-bold mt-2">
              Monto mínimo
            </p>
            <p className="text-lg font-bold mt-2">
              ${packageItem.minAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </>
        )}

        {(!packageItem.percentage) && (
          <>
            <br/ >
            <p className="text-2xl font-bold mt-2">
              ${packageItem.price.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} + IVA
            </p>
          </>
        )}

        {packageItem.shortDescription && (
          <CardDescription className="text-base mt-3 italic">
            {packageItem.shortDescription}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-6 p-12">
          {featureCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {category.title && (
                <h4 className="font-semibold text-md text-primary uppercase tracking-wide mb-3 text-center underline">
                  {category.title}
                </h4>
              )}
              <ul className="space-y-2">
                {category.items.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="mt-auto pt-4 flex flex-col gap-4">
        {packageItem.description && (
          <p className="text-sm text-muted-foreground text-center w-full">
            {packageItem.description}
          </p>
        )}
        
        <Button asChild className={cn(
          "w-full text-lg py-6",
           packageItem.highlight ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-accent hover:bg-accent/90 text-accent-foreground"
           )}>
          <Link href={packageItem.ctaLink}>{packageItem.ctaText ?? t.actions.learnMore}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
