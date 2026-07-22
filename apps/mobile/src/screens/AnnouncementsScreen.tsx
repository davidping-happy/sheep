import Placeholder from '../components/Placeholder';

export default function AnnouncementsScreen() {
  return (
    <Placeholder
      endpoint="GET /announcements"
      note="牧區最新資訊/公告；搭配 FCM 分眾推播。"
    />
  );
}
