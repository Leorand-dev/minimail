import ComposePage from './ComposePage';
import { useMailStore } from '@/stores/mail';

export default function ComposePanel() {
  const setActiveView = useMailStore((s) => s.setActiveView);
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ComposePage onBack={() => setActiveView('mail')} />
    </div>
  );
}
