import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dice5, ScrollText } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import DiceRollerRibbon from '@/components/DiceRollerRibbon';
import DiceRollLog from '@/components/DiceRollLog';

const DiceRoller = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'roller' | 'log'>('roller');

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/admin');
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 p-3 border-b border-border shrink-0">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
        </Button>
        <h1 className="text-lg font-bold tracking-wider flex-1">🎲 DICE ROLLER</h1>
        {isMobile && (
          <div className="flex gap-1">
            <Button
              variant={mobileView === 'roller' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileView('roller')}
            >
              <Dice5 className="h-4 w-4 mr-1" /> Roller
            </Button>
            <Button
              variant={mobileView === 'log' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileView('log')}
            >
              <ScrollText className="h-4 w-4 mr-1" /> Log
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Roller panel */}
        <div
          className={`${
            isMobile ? (mobileView === 'roller' ? 'flex' : 'hidden') : 'flex'
          } lg:flex justify-center bg-[#070911] lg:w-[420px] lg:shrink-0 lg:border-r lg:border-border h-full`}
        >
          <div className="w-full max-w-md h-full">
            <DiceRollerRibbon embedded />
          </div>
        </div>

        {/* Log panel */}
        <div
          className={`${
            isMobile ? (mobileView === 'log' ? 'block' : 'hidden') : 'block'
          } lg:block flex-1 min-h-0 overflow-y-auto p-4`}
        >
          <DiceRollLog />
        </div>
      </main>
    </div>
  );
};

export default DiceRoller;
