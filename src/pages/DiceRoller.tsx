import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import DiceRollerRibbon from '@/components/DiceRollerRibbon';

const DiceRoller = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();

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
        <h1 className="text-lg font-bold tracking-wider">🎲 DICE ROLLER</h1>
      </header>
      <main className="flex-1 min-h-0 flex justify-center bg-[#070911]">
        <div className="w-full max-w-md h-full">
          <DiceRollerRibbon embedded />
        </div>
      </main>
    </div>
  );
};

export default DiceRoller;
