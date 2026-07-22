import Placeholder from '../components/Placeholder';

export default function LivestreamScreen() {
  return (
    <Placeholder
      endpoint="GET /livestream/latest"
      note="以官方 YouTube embed 播放最新主日影片；WebView 限白名單網域（§四.5）。"
    />
  );
}
