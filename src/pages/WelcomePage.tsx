import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { nickname, setNickname } = useFinanceStore();
  const [name, setName] = useState(nickname);

  const handleContinue = () => {
    const value = name.trim();
    if (!value) {
      toast.error('Please enter a nickname.');
      return;
    }

    setNickname(value);
    toast.success(`Welcome, ${value}!`);
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-2xl border border-border bg-card/80 p-8 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <img src="/favicon.ico" alt="Finbo logo" className="h-24 w-24 rounded-3xl" />
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-foreground">
              <span className="text-primary">Fin</span>bo
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Welcome to your financial workspace. Choose a nickname to get started.
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-md space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="welcome-nickname">Nickname</Label>
              <Input
                id="welcome-nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jam"
                maxLength={30}
              />
            </div>
            <Button onClick={handleContinue} className="w-full">
              Continue to dashboard
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
