import { useMailStore } from '@/stores/mail';
import SettingsPage from './SettingsPage';

export default function SettingsPanel() {
  const setActiveView = useMailStore((s) => s.setActiveView);
  return (
    <div className="flex-1 overflow-y-auto min-w-0">
      <SettingsPage onBack={() => setActiveView('mail')} />
    </div>
  );
}
