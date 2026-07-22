import Placeholder from '../components/Placeholder';

export default function EventsScreen() {
  return (
    <Placeholder
      endpoint="GET /events ・ POST /events/:id/register ・ /checkin"
      note="活動報名（額滿轉候補）與現場動態 QR Code 簽到（短效期 Token）。"
    />
  );
}
