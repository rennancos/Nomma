import { useAction } from '@/hooks/useFinanceActions';
import { GettingStartedGuide } from './GettingStartedGuide';
import { completeOnboarding } from './repository';

export function FirstUseGuide() {
  const { run, busy } = useAction();
  return <GettingStartedGuide standalone busy={busy} onFinish={() => run(completeOnboarding)} />;
}
