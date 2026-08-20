import { Building2, Wallet, Smartphone, ZoomIn, Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type SupportMethod = {
  title: string;
  description: string;
  icon: typeof Building2;
  qrSrc: string;
};

const supportMethods: SupportMethod[] = [
  {
    title: 'GCash',
    description: 'Scan to send support via GCash (InstaPay).',
    icon: Smartphone,
    qrSrc: '/qr/gcash.jpeg',
  },
  {
    title: 'MariBank',
    description: 'Scan to send support via MariBank (InstaPay).',
    icon: Building2,
    qrSrc: '/qr/maribank.png',
  },
  {
    title: 'PayPal',
    description: 'Scan to pay or send support via PayPal.',
    icon: Wallet,
    qrSrc: '/qr/paypal.jpeg',
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
          <Dialog key={title}>
            <Card className="flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
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
                <DialogTrigger asChild>
                  <div className="group relative flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-muted/30">
                    <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
                      <div className="relative flex items-center justify-center rounded-lg bg-muted/30 p-3">
                        <img
                          src={qrSrc}
                          alt={`${title} QR code`}
                          className="h-full w-full max-h-[240px] object-contain transition-opacity duration-200 group-hover:opacity-90"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                          <span className="flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md">
                            <ZoomIn className="h-4 w-4 text-primary" />
                            Click to enlarge & scan
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <ZoomIn className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Click image to enlarge for easy scanning
                </p>
              </CardContent>
            </Card>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {title} QR Code
                </DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:p-6">
                <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-lg">
                  <img
                    src={qrSrc}
                    alt={`${title} enlarged QR code`}
                    className="h-auto max-h-[70vh] w-full rounded-lg object-contain"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                <p className="text-xs text-muted-foreground">Scan with your camera or mobile app.</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={qrSrc} download={`finbo-${title.toLowerCase()}-qr`}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
