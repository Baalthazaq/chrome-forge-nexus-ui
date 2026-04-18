import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dice5, ScrollText } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import DiceRollerRibbon from '@/components/DiceRollerRibbon';
import DiceRollLog from '@/components/DiceRollLog';

const DiceRoller = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();
  const [view, setView] = useState<'roller' | 'log'>('roller');

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/admin');
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) return null;

  const showingLog = view === 'log';

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 p-3 border-b border-border shrink-0">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-lg font-bold tracking-wider flex-1 truncate">🎲 DICE ROLLER</h1>
        {/* Toggle visible below lg breakpoint (mobile + tablet) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView(showingLog ? 'roller' : 'log')}
          className="lg:hidden shrink-0"
        >
          {showingLog ? (
            <><Dice5 className="h-4 w-4 mr-1" /> Roller</>
          ) : (
            <><ScrollText className="h-4 w-4 mr-1" /> Log</>
          )}
        </Button>
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Roller panel */}
        <div
          className={`${showingLog ? 'hidden' : 'flex'} lg:flex justify-center bg-[#070911] w-full lg:w-[420px] lg:shrink-0 lg:border-r lg:border-border h-full min-h-0`}
        >
          <div className="w-full max-w-md h-full">
            <DiceRollerRibbon embedded />
          </div>
        </div>

        {/* Log panel */}
        <div
          className={`${showingLog ? 'block' : 'hidden'} lg:block flex-1 min-h-0 overflow-y-auto p-4`}
        >
          <DiceRollLog />
        </div>
      </main>
    </div>
  );
};

export default DiceRoller;
