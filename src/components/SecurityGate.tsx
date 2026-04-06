import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { clearFinboDeviceData, isValidPin, verifyPin } from '@/lib/security';
import { DEFAULT_AUTO_LOCK_MINUTES, useSecurityStore } from '@/store/securityStore';

function PinEntryScreen({
  isSubmitting,
  onSubmit,
  onReset,
}: {
  isSubmitting: boolean;
  onSubmit: (values: { pin: string }) => Promise<void>;
  onReset: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPin('');
    setError(null);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!isValidPin(pin)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }

    setError(null);

    try {
      await onSubmit({ pin });
      setPin('');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <Card className="w-full shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <img src="/favicon.ico" alt="Finbo Logo" className="mx-auto h-16 w-16 rounded-2xl shadow-sm" />
            <div className="space-y-2">
              <CardTitle className="text-2xl">Unlock Finbo</CardTitle>
              <CardDescription>Enter your 4-6 digit PIN to view your financial data.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="Enter 4-6 digits"
                  type="password"
                  maxLength={6}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unlocking
                  </>
                ) : (
                  'Unlock'
                )}
              </Button>
            </form>

            <Alert className="border-amber-500/30 bg-amber-500/10">
              <TriangleAlert className="h-4 w-4 text-amber-600" />
              <AlertTitle>Privacy note</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  This PIN protects data only on this browser and device. If browser storage is cleared, the PIN and
                  app data are lost.
                </p>
                <p className="text-xs text-muted-foreground">
                  Each device or browser will need its own PIN.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    Reset this device
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset this device?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear the saved PIN and all locally stored Finbo data in this browser. This cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onReset}>Reset now</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SecurityGate({ children }: { children: ReactNode }) {
  const { pinHash, pinSalt, autoLockMinutes, hydrated } = useSecurityStore();
  const [locked, setLocked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const hasPin = Boolean(pinHash && pinSalt);
  const lockEnabled = hasPin;

  const timeoutMs = useMemo(
    () => Math.max(1, autoLockMinutes || DEFAULT_AUTO_LOCK_MINUTES) * 60 * 1000,
    [autoLockMinutes],
  );

  const clearAutoLockTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    clearAutoLockTimer();
    setLocked(true);
  }, [clearAutoLockTimer]);

  const unlock = useCallback(() => {
    clearAutoLockTimer();
    setLocked(false);
  }, [clearAutoLockTimer]);

  useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;
    setLocked(hasPin);
  }, [hasPin, hydrated]);

  useEffect(() => {
    if (!hydrated || locked || !lockEnabled || !pinHash || !pinSalt) {
      clearAutoLockTimer();
      return;
    }

    const scheduleAutoLock = () => {
      clearAutoLockTimer();
      timeoutRef.current = window.setTimeout(() => {
        toast.info('Locked for privacy.');
        lock();
      }, timeoutMs);
    };

    const handleActivity = () => {
      scheduleAutoLock();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        toast.info('Locked because the app lost focus.');
        lock();
      }
    };

    scheduleAutoLock();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('focus', handleActivity);
    window.addEventListener('blur', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearAutoLockTimer();
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('blur', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [clearAutoLockTimer, hydrated, lock, lockEnabled, locked, pinHash, pinSalt, timeoutMs]);

  const handleSubmit = async ({ pin }: { pin: string }) => {
    if (!isValidPin(pin)) {
      throw new Error('PIN must be 4 to 6 digits.');
    }

    setIsSubmitting(true);
    try {
      if (!pinHash || !pinSalt) {
        throw new Error('No PIN is set on this device.');
      }

      const valid = await verifyPin(pin, pinSalt, pinHash);
      if (!valid) {
        throw new Error('Incorrect PIN.');
      }

      toast.success('Unlocked.');
      unlock();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    clearFinboDeviceData();
    window.location.reload();
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading security settings...</span>
        </div>
      </div>
    );
  }

  if (lockEnabled && locked) {
    return <PinEntryScreen isSubmitting={isSubmitting} onSubmit={handleSubmit} onReset={handleReset} />;
  }

  return <>{children}</>;
}
