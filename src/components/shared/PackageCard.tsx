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

export function PackageCard({ packageItem }: PackageCardProps) {
  return (
    <Card className={cn(
      "flex flex-col h-full rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300",
      packageItem.highlight ? "border-2 border-primary bg-primary/5" : "bg-card"
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-2xl text-primary">{packageItem.name}</CardTitle>
        <CardDescription className="text-base h-16">{packageItem.description}</CardDescription>
        <p className="text-4xl font-bold text-foreground pt-2">
          ${packageItem.price}
          <span className="text-sm font-normal text-muted-foreground">{t.misc.perMonth}</span>
        </p>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2">
          {packageItem.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild className={cn(
          "w-full text-lg py-6",
           packageItem.highlight ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-accent hover:bg-accent/90 text-accent-foreground"
           )}>
          <Link href={packageItem.ctaLink}>{packageItem.ctaText || t.actions.learnMore}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
