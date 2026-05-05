import { AppFrame } from "@/components/AppFrame";
import { PartyRoom } from "@/components/PartyRoom";

export default function PartyPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { eventId } = params;
  return (
    <AppFrame label="Guest" eventId={eventId}>
      <PartyRoom eventId={eventId} />
    </AppFrame>
  );
}
