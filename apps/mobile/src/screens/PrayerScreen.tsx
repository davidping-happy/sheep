import Placeholder from '../components/Placeholder';

export default function PrayerScreen() {
  return (
    <Placeholder
      endpoint="GET /prayer/feed ・ POST /prayer"
      note="代禱牆。發布時預設「私人」，可選小組可見/公開與匿名；公開內容需經審核。發文者可隨時下架。"
    />
  );
}
