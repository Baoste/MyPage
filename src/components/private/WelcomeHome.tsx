import { ProceduralTree } from "@/components/private/tree/ProceduralTree";
import type { PhotoActivityStats } from "@/types";

interface WelcomeHomeProps {
  activity: PhotoActivityStats;
}

export function WelcomeHome({ activity }: WelcomeHomeProps) {
  return (
    <main className="flex min-h-0 flex-1">
      <ProceduralTree activity={activity} />
    </main>
  );
}
