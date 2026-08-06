import { DeliveryShell } from '@/components/delivery/DeliveryShell';

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return <DeliveryShell>{children}</DeliveryShell>;
}
