import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Path, Line, G } from 'react-native-svg';
import { SocialPlatform, getPlatforSVGIcon } from '../../../lib/social-links';
import { Colors } from '../../../lib';

interface SocialIconProps {
  platform: SocialPlatform;
  size?: number;
  color?: string;
}

export function SocialIcon({ platform, size = 24, color }: SocialIconProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const iconColor = color || colors.text;

  const svgString = getPlatforSVGIcon(platform);

  if (!svgString) {
    // Fallback: return null or a default icon
    return null;
  }

  // Parse viewBox from SVG string
  const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // Parse stroke-width if present
  const strokeWidthMatch = svgString.match(/stroke-width="([^"]+)"/);
  const strokeWidth = strokeWidthMatch ? strokeWidthMatch[1] : undefined;

  // Extract path data and line elements
  const pathMatches = svgString.matchAll(/<path[^>]*d="([^"]+)"[^>]*(?:\/?>|><\/path>)/g);
  const lineMatches = svgString.matchAll(/<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"[^>]*(?:\/?>|><\/line>)/g);

  const paths = Array.from(pathMatches).map(match => match[1]);
  const lines = Array.from(lineMatches).map(match => ({
    x1: match[1],
    y1: match[2],
    x2: match[3],
    y2: match[4],
  }));

  // Check if SVG uses stroke or fill
  const useStroke = svgString.includes('stroke="currentColor"');
  const useFill = svgString.includes('fill="currentColor"') || !useStroke;

  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <G>
        {paths.map((d, index) => {
          // Check if this specific path has fill="none"
          const pathSegment = svgString.split('<path')[index + 1];
          const hasFillNone = pathSegment?.includes('fill="none"');

          return (
            <Path
              key={`path-${index}`}
              d={d}
              fill={hasFillNone ? 'none' : (useFill ? iconColor : 'none')}
              stroke={useStroke ? iconColor : 'none'}
              strokeWidth={strokeWidth}
            />
          );
        })}
        {lines.map((line, index) => (
          <Line
            key={`line-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={iconColor}
            strokeWidth={strokeWidth || '1'}
          />
        ))}
      </G>
    </Svg>
  );
}
