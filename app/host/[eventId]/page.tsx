import { AppFrame } from "@/components/AppFrame";
import { CopyGuestLink } from "@/components/CopyGuestLink";
import { HostPanel } from "@/components/HostPanel";

export default function HostPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { eventId } = params;
  return (
    <AppFrame
      label="Booth"
      eventId={eventId}
      right={<CopyGuestLink eventId={eventId} />}
    >
      <HostPanel eventId={eventId} hostSecret="" />
    </AppFrame>
  );
}
