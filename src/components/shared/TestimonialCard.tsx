import type { Testimonial } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Star } from 'lucide-react';

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const initials = testimonial.name.split(' ').map(n => n[0]).join('');
  return (
    <Card className="flex flex-col h-full bg-card rounded-xl shadow-lg overflow-hidden">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-14 w-14 border-2 border-primary">
            <AvatarImage asChild src={testimonial.avatarUrl} alt={testimonial.name} >
              <Image src={testimonial.avatarUrl} alt={testimonial.name} width={56} height={56} data-ai-hint={testimonial.dataAiHint} />
            </AvatarImage>
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-lg font-semibold font-headline text-foreground">{testimonial.name}</h4>
            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <div className="flex mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        <blockquote className="italic text-foreground/90">
          "{testimonial.quote}"
        </blockquote>
      </CardContent>
       <CardFooter className="p-6 pt-0 mt-auto">
      </CardFooter>
    </Card>
  );
}
