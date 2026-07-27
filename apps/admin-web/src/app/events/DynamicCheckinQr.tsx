'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  payload: string;
  token: string;
  expiresAt: string;
  ttlSeconds: number;
  onRefresh: () => void;
  autoRotate: boolean;
}

/** 階段三：動態 QR 顯示；倒數後自動向父層請求換碼 */
export function DynamicCheckinQr({
  payload,
  token,
  expiresAt,
  ttlSeconds,
  onRefresh,
  autoRotate,
}: Props) {
  const [dataUrl, setDataUrl] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(ttlSeconds);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (left <= 0 && autoRotate) onRefresh();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [expiresAt, autoRotate, onRefresh]);

  return (
    <div style={box}>
      <div className="muted">現場動態簽到 QR（約 {ttlSeconds} 秒輪替）</div>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="簽到 QR Code" width={240} height={240} />
      ) : (
        <p className="muted">產生 QR 中…</p>
      )}
      <div>
        剩餘 <strong>{secondsLeft}</strong> 秒
      </div>
      <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{token}</code>
      <div className="muted" style={{ fontSize: 12 }}>
        會友可掃碼，或手動輸入上方簽到碼／完整 payload
      </div>
    </div>
  );
}

const box: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  background: '#f8fafc',
  border: '1px dashed #cbd5e1',
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'flex-start',
};
