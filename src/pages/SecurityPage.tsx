import { useMemo, useState } from 'react';
import { Shield, KeyRound, Clock3, TriangleAlert, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { clearFinboDeviceData, createPinRecord, isValidPin, verifyPin } from '@/lib/security';
import { DEFAULT_AUTO_LOCK_MINUTES, useSecurityStore } from '@/store/securityStore';

const AUTO_LOCK_OPTIONS = [1, 5, 10, 15, 30, 60];

export default function SecurityPage() {
  const { pinHash, pinSalt, autoLockMinutes, setAutoLockMinutes, setPinRecord } = useSecurityStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  const autoLockLabel = useMemo(() => {
    if (autoLockMinutes === DEFAULT_AUTO_LOCK_MINUTES) return '15 minutes';
    return `${autoLockMinutes} minute${autoLockMinutes === 1 ? '' : 's'}`;
  }, [autoLockMinutes]);

  const handleChangePin = async () => {
    if (!pinHash || !pinSalt) {
      toast.error('No PIN is currently set.');
      return;
    }

    if (!isValidPin(currentPin)) {
      toast.error('Current PIN must be 4 to 6 digits.');
      return;
    }

    if (!isValidPin(newPin)) {
      toast.error('New PIN must be 4 to 6 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('New PIN confirmation does not match.');
      return;
    }

    setIsSavingPin(true);
    try {
      const valid = await verifyPin(currentPin, pinSalt, pinHash);
      if (!valid) {
        toast.error('Current PIN is incorrect.');
        return;
      }

      const { hash, salt } = await createPinRecord(newPin);
      setPinRecord(hash, salt);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      toast.success('PIN updated.');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleResetDevice = () => {
    clearFinboDeviceData();
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Security</h1>
            <p className="text-muted-foreground">Manage your local PIN and auto-lock behavior.</p>
          </div>
        </div>
      </div>

      <Alert className="border-amber-500/30 bg-amber-500/10">
        <TriangleAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle>Local-only protection</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Your PIN never leaves this device. Finbo stores only a salted SHA-256 hash locally in the browser.
          </p>
          <p>
            Clearing browser storage will erase both the PIN and your saved app data.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change PIN
            </CardTitle>
            <CardDescription>Update the PIN on this browser and device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pin">Current PIN</Label>
              <Input
                id="current-pin"
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value)}
                inputMode="numeric"
                pattern="\d*"
                placeholder="Enter current PIN"
                type="password"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                inputMode="numeric"
                pattern="\d*"
                placeholder="Enter 4-6 digits"
                type="password"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-pin">Confirm new PIN</Label>
              <Input
                id="confirm-new-pin"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                inputMode="numeric"
                pattern="\d*"
                placeholder="Re-enter new PIN"
                type="password"
                maxLength={6}
              />
            </div>
            <Button onClick={handleChangePin} disabled={isSavingPin} className="w-full">
              {isSavingPin ? 'Saving PIN...' : 'Save new PIN'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Auto-lock timeout
            </CardTitle>
            <CardDescription>Choose how long Finbo stays unlocked before it asks for your PIN again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Timeout</Label>
              <Select value={String(autoLockMinutes)} onValueChange={(value) => setAutoLockMinutes(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent>
                  {AUTO_LOCK_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} minute{minutes === 1 ? '' : 's'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Current timeout: <span className="font-medium text-foreground">{autoLockLabel}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Reset this device
          </CardTitle>
          <CardDescription>Clear the local PIN and app data stored in this browser.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>This is for when you forget the PIN or want to start fresh on this browser.</p>
            <p>It will remove your saved finance data too.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Finbo on this device?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will erase the PIN and all locally stored financial data in this browser. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDevice}>Reset now</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            What this protects
          </CardTitle>
          <CardDescription>Useful reminders about how the local PIN works.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Each browser and device gets its own PIN.</p>
          <p>The PIN is required on launch, after inactivity, and when the tab loses focus.</p>
          <p>Clearing browser storage removes the PIN and the data together.</p>
        </CardContent>
      </Card>
    </div>
  );
}
