import { useMailStore } from '@/stores/mail';
import ContactsPage from './ContactsPage';

export default function ContactsPanel() {
  const setActiveView = useMailStore((s) => s.setActiveView);
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ContactsPage onBack={() => setActiveView('mail')} />
    </div>
  );
}
