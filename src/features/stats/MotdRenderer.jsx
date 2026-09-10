import React, { useMemo } from 'react';
import './MotdRenderer.css';

const MC_COLORS = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#FF5555',
  'd': '#FF55FF',
  'e': '#FFFF55',
  'f': '#FFFFFF',
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  dark_gray: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF'
};

function componentToText(comp) {
  if (!comp) return '';
  if (typeof comp === 'string') return comp;
  if (Array.isArray(comp)) return comp.map(componentToText).join('');
  let out = '';
  if (comp.color) {
    if (MC_COLORS[comp.color]) {
      const code = Object.keys(MC_COLORS).find(
        (k) => MC_COLORS[k] === MC_COLORS[comp.color] && k.length === 1
      );
      if (code) out += `§${code}`;
      else if (comp.color.startsWith('#')) {
        const hex = comp.color.slice(1);
        out += `§x§${hex[0]}§${hex[1]}§${hex[2]}§${hex[3]}§${hex[4]}§${hex[5]}`;
      }
    } else if (comp.color.startsWith('#')) {
      const hex = comp.color.slice(1);
      out += `§x§${hex[0]}§${hex[1]}§${hex[2]}§${hex[3]}§${hex[4]}§${hex[5]}`;
    }
  }
  if (comp.bold) out += '§l';
  if (comp.italic) out += '§o';
  if (comp.underlined) out += '§n';
  if (comp.strikethrough) out += '§m';
  if (comp.text) out += comp.text;
  if (Array.isArray(comp.extra)) {
    out += comp.extra.map(componentToText).join('');
  }
  return out;
}

export function parseMotd(input) {
  if (!input) return [];
  const text = typeof input === 'object' ? componentToText(input) : String(input);
  const rawLines = text.split(/\r?\n/);

  return rawLines.slice(0, 2).map((line) => {
    const tokens = [];
    let currentColor = '#ffffff';
    let bold = false;
    let italic = false;
    let underline = false;
    let strike = false;

    let buf = '';
    const flush = () => {
      if (buf) {
        tokens.push({
          text: buf,
          color: currentColor,
          bold,
          italic,
          underline,
          strike
        });
        buf = '';
      }
    };

    let i = 0;
    while (i < line.length) {
      if ((line[i] === '§' || line[i] === '&') && i + 1 < line.length) {
        const code = line[i + 1].toLowerCase();
        // Check hex format: §x§r§r§g§g§b§b
        if (
          code === 'x' &&
          i + 13 < line.length &&
          line[i + 2] === '§' &&
          line[i + 4] === '§' &&
          line[i + 6] === '§' &&
          line[i + 8] === '§' &&
          line[i + 10] === '§' &&
          line[i + 12] === '§'
        ) {
          flush();
          currentColor = `#${line[i + 3]}${line[i + 5]}${line[i + 7]}${line[i + 9]}${line[i + 11]}${line[i + 13]}`;
          i += 14;
          continue;
        }

        if (MC_COLORS[code]) {
          flush();
          currentColor = MC_COLORS[code];
          bold = false;
          italic = false;
          underline = false;
          strike = false;
          i += 2;
          continue;
        } else if (code === 'l') {
          flush();
          bold = true;
          i += 2;
          continue;
        } else if (code === 'o') {
          flush();
          italic = true;
          i += 2;
          continue;
        } else if (code === 'n') {
          flush();
          underline = true;
          i += 2;
          continue;
        } else if (code === 'm') {
          flush();
          strike = true;
          i += 2;
          continue;
        } else if (code === 'r') {
          flush();
          currentColor = '#ffffff';
          bold = false;
          italic = false;
          underline = false;
          strike = false;
          i += 2;
          continue;
        }
      }
      buf += line[i];
      i++;
    }
    flush();
    return tokens;
  });
}

export default function MotdRenderer({ motd, rawDescription, className = '' }) {
  const lines = useMemo(() => {
    return parseMotd(rawDescription || motd);
  }, [rawDescription, motd]);

  if (!lines.length) {
    return (
      <div className={`motd-container ${className}`}>
        <div className="motd-line empty">A Minecraft Server</div>
      </div>
    );
  }

  return (
    <div className={`motd-container ${className}`}>
      {lines.map((lineTokens, lineIdx) => (
        <div key={lineIdx} className="motd-line">
          {lineTokens.length ? (
            lineTokens.map((token, tokIdx) => (
              <span
                key={tokIdx}
                style={{
                  color: token.color,
                  fontWeight: token.bold ? 700 : 400,
                  fontStyle: token.italic ? 'italic' : 'normal',
                  textDecoration: token.underline
                    ? token.strike
                      ? 'underline line-through'
                      : 'underline'
                    : token.strike
                      ? 'line-through'
                      : 'none'
                }}
              >
                {token.text}
              </span>
            ))
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      ))}
    </div>
  );
}
