import { router } from 'expo-router';
import { GettingStartedGuide } from '@/features/onboarding/GettingStartedGuide';

export default function GettingStartedRoute() {
  return <GettingStartedGuide onFinish={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
