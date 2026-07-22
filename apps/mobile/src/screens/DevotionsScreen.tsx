import Placeholder from '../components/Placeholder';

export default function DevotionsScreen() {
  return (
    <Placeholder
      endpoint="GET/POST /devotions"
      note="個人靈修筆記。內容在後端 AES-256 加密儲存，預設私人可見；可選擇分享到小組。"
    />
  );
}
