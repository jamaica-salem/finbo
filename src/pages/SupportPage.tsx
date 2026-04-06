import { Building2, Wallet, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SupportMethod = {
  title: string;
  description: string;
  icon: typeof Building2;
  qrSrc: string;
};

const supportMethods: SupportMethod[] = [
  {
    title: 'Bank Account 1',
    description: 'Scan to send support directly to my first bank account.',
    icon: Building2,
    qrSrc: '/placeholder.svg',
  },
  {
    title: 'Bank Account 2',
    description: 'Scan to send support directly to my second bank account.',
    icon: Wallet,
    qrSrc: '/placeholder.svg',
  },
  {
    title: 'E-Wallet',
    description: 'Scan to send support through my e-wallet.',
    icon: Smartphone,
    qrSrc: '/placeholder.svg',
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Finbo"
        description="If you’d like to support the app, scan one of the QR codes below."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <img src="/favicon.ico" alt="Finbo logo" className="h-12 w-12 rounded-xl shadow-sm" />
            <div className="space-y-1">
              <CardTitle className="text-lg">Thank you for being here</CardTitle>
              <CardDescription>
                Your support helps keep Finbo free, polished, and growing for everyone.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">Quick scan</Badge>
          <Badge variant="secondary">Direct transfer</Badge>
          <Badge variant="secondary">Keeps the app free</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-foreground">Small help, big impact</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Even a tiny boost helps cover updates, improvements, and ongoing maintenance.
            </p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-foreground">Choose any account</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use whichever QR is most convenient for you.
            </p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-foreground">Simple and direct</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan, send, and you’re done.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {supportMethods.map(({ title, description, icon: Icon, qrSrc }) => (
          <Card key={title} className="overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {title}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0">QR</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={cn('flex items-center justify-center rounded-2xl border border-dashed border-border bg-background p-5')}>
                <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-center rounded-lg bg-muted/30 p-3">
                    <img
                      src={qrSrc}
                      alt={`${title} QR code`}
                      className="h-full w-full max-h-[240px] object-contain"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Scan this code to send support directly.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
