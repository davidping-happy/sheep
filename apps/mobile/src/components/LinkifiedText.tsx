import { Fragment, type ReactNode } from 'react';
import {
  Alert,
  Linking,
  StyleProp,
  Text,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

/**
 * 將純文字中的網址自動轉成可點擊連結。
 * - 支援 http(s)://（Google 表單等）與裸網址（line.me/... 等）
 * - 點擊後用系統開啟：line.me 會喚起 LINE App，其餘用瀏覽器
 */

// http(s) 連結，或以常見網域開頭的裸網址（line.me、docs.google.com…）
const URL_REGEX =
  /((?:https?:\/\/|www\.)[^\s]+|(?:line\.me|lin\.ee|docs\.google\.com|forms\.gle|youtu\.be|youtube\.com)\/[^\s]+)/gi;

// 網址結尾常見的中英文標點，不算在連結內
const TRAILING = /[)\]}>.,，。、；;：:!！?？」』】]+$/;

function openUrl(raw: string) {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('無法開啟連結', url);
  });
}

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
};

export function LinkifiedText({ text, style, linkStyle }: Props) {
  const nodes: ReactNode[] = [];
  const re = new RegExp(URL_REGEX);
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    let url = match[0];
    let tail = '';

    const trailing = TRAILING.exec(url);
    if (trailing) {
      tail = trailing[0];
      url = url.slice(0, url.length - tail.length);
    }

    if (start > lastIndex) {
      nodes.push(
        <Fragment key={`t${key++}`}>{text.slice(lastIndex, start)}</Fragment>,
      );
    }

    nodes.push(
      <Text
        key={`l${key++}`}
        style={[styles.link, linkStyle]}
        onPress={() => openUrl(url)}
        suppressHighlighting={false}
      >
        {url}
      </Text>,
    );

    if (tail) {
      nodes.push(<Fragment key={`p${key++}`}>{tail}</Fragment>);
    }

    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t${key++}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return <Text style={style}>{nodes}</Text>;
}

const styles = {
  link: {
    color: theme.color.brand,
    textDecorationLine: 'underline' as const,
    fontWeight: '600' as const,
  },
};
