'use client';

import React, { useState, useEffect } from 'react';

// 간소화된 노선도 좌표 데이터 (프로토타입용)
// 실제 지도 기반이 아닌 토폴로지 맵(Topology Map) 형태
interface StationNode {
    id: string;
    name: string;
    line: string;
    x: number;
    y: number;
}

interface Link {
    source: string;
    target: string;
    line: string;
}

const STATION_NODES: StationNode[] = [
    // 1호선 (Blue) - 간소화: 서울역 중심 수직/수평
    { id: '133', name: '서울역', line: '1호선', x: 400, y: 300 },
    { id: '132', name: '시청', line: '1호선', x: 400, y: 250 },
    { id: '131', name: '종각', line: '1호선', x: 450, y: 250 },
    { id: '130', name: '종로3가', line: '1호선', x: 500, y: 250 },
    { id: '129', name: '종로5가', line: '1호선', x: 550, y: 250 },
    { id: '134', name: '남영', line: '1호선', x: 400, y: 350 },
    { id: '135', name: '용산', line: '1호선', x: 400, y: 400 },
    { id: '136', name: '노량진', line: '1호선', x: 350, y: 450 },

    // 2호선 (Green) - 순환선 (원형 배치)
    { id: '201', name: '시청', line: '2호선', x: 400, y: 250 }, // 환승
    { id: '202', name: '을지로입구', line: '2호선', x: 460, y: 220 },
    { id: '203', name: '을지로3가', line: '2호선', x: 520, y: 220 },
    { id: '204', name: '을지로4가', line: '2호선', x: 580, y: 220 },
    { id: '205', name: '동대문역사문화공원', line: '2호선', x: 620, y: 260 },
    { id: '206', name: '신당', line: '2호선', x: 640, y: 320 },
    { id: '207', name: '상왕십리', line: '2호선', x: 640, y: 380 },
    { id: '208', name: '왕십리', line: '2호선', x: 620, y: 440 },
    { id: '209', name: '한양대', line: '2호선', x: 580, y: 480 },
    { id: '210', name: '뚝섬', line: '2호선', x: 540, y: 500 },
    { id: '211', name: '성수', line: '2호선', x: 500, y: 520 },
    { id: '212', name: '건대입구', line: '2호선', x: 560, y: 520 }, // 위치 조정 필요
    { id: '216', name: '잠실', line: '2호선', x: 650, y: 550 },
    { id: '222', name: '강남', line: '2호선', x: 500, y: 600 },
    { id: '223', name: '교대', line: '2호선', x: 400, y: 600 },
    { id: '226', name: '사당', line: '2호선', x: 300, y: 580 },
    { id: '230', name: '신림', line: '2호선', x: 200, y: 550 },
    { id: '234', name: '신도림', line: '2호선', x: 150, y: 450 },
    { id: '239', name: '홍대입구', line: '2호선', x: 200, y: 250 },
    { id: '240', name: '신촌', line: '2호선', x: 250, y: 220 },
    { id: '241', name: '이대', line: '2호선', x: 300, y: 220 },
    { id: '242', name: '아현', line: '2호선', x: 350, y: 220 },
    { id: '243', name: '충정로', line: '2호선', x: 380, y: 230 },
];

const LINKS: Link[] = [
    // 1호선 연결
    { source: '129', target: '130', line: '1호선' },
    { source: '130', target: '131', line: '1호선' },
    { source: '131', target: '132', line: '1호선' },
    { source: '132', target: '133', line: '1호선' },
    { source: '133', target: '134', line: '1호선' },
    { source: '134', target: '135', line: '1호선' },
    { source: '135', target: '136', line: '1호선' },

    // 2호선 연결 (일부 생략된 구간은 직선 연결)
    { source: '201', target: '202', line: '2호선' },
    { source: '202', target: '203', line: '2호선' },
    { source: '203', target: '204', line: '2호선' },
    { source: '204', target: '205', line: '2호선' },
    { source: '205', target: '206', line: '2호선' },
    { source: '206', target: '207', line: '2호선' },
    { source: '207', target: '208', line: '2호선' },
    { source: '208', target: '209', line: '2호선' },
    { source: '209', target: '210', line: '2호선' },
    { source: '210', target: '211', line: '2호선' },
    { source: '211', target: '212', line: '2호선' },
    // ... 중간 생략 구간은 데모용으로 바로 연결
    { source: '212', target: '216', line: '2호선' },
    { source: '216', target: '222', line: '2호선' },
    { source: '222', target: '223', line: '2호선' },
    { source: '223', target: '226', line: '2호선' },
    { source: '226', target: '230', line: '2호선' },
    { source: '230', target: '234', line: '2호선' },
    { source: '234', target: '239', line: '2호선' },
    { source: '239', target: '240', line: '2호선' },
    { source: '240', target: '241', line: '2호선' },
    { source: '241', target: '242', line: '2호선' },
    { source: '242', target: '243', line: '2호선' },
    { source: '243', target: '201', line: '2호선' },
];

const LINE_COLORS: Record<string, string> = {
    '1호선': '#0052A4',
    '2호선': '#00A84D',
    '3호선': '#EF7C1C',
    '4호선': '#00A5DE',
    '5호선': '#996CAC',
    '6호선': '#CD7C2F',
    '7호선': '#747F00',
    '8호선': '#E6186C',
};

interface Props {
    selectedLine: string;
    onStationSelect: (stationName: string, line: string) => void;
    selectedStation: string;
}

export default function InteractiveSubwayMap({ selectedLine, onStationSelect, selectedStation }: Props) {
    const [hoveredStation, setHoveredStation] = useState<string | null>(null);

    return (
        <div style={{
            width: '100%',
            height: '500px',
            background: '#fff',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <svg
                viewBox="0 0 800 700"
                style={{ width: '100%', height: '100%' }}
            >
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="28" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#fff" />
                    </marker>
                </defs>

                {/* Links (Line Paths) */}
                {LINKS.map((link, idx) => {
                    const s = STATION_NODES.find(n => n.id === link.source);
                    const t = STATION_NODES.find(n => n.id === link.target);
                    if (!s || !t) return null;

                    const isSelectedLine = link.line === selectedLine;

                    return (
                        <g key={`${link.source}-${link.target}`}>
                            {/* 노선 라인 */}
                            <line
                                x1={s.x} y1={s.y}
                                x2={t.x} y2={t.y}
                                stroke={LINE_COLORS[link.line] || '#ccc'}
                                strokeWidth={isSelectedLine ? 8 : 4}
                                strokeOpacity={isSelectedLine ? 1 : 0.3}
                                strokeLinecap="round"
                                style={{ transition: 'all 0.3s ease' }}
                            />

                            {/* 애니메이션 흐름 (선택된 호선만) */}
                            {isSelectedLine && (
                                <circle r="3" fill="#fff">
                                    <animateMotion
                                        dur="2s"
                                        repeatCount="indefinite"
                                        path={`M${s.x},${s.y} L${t.x},${t.y}`}
                                    />
                                </circle>
                            )}
                        </g>
                    );
                })}

                {/* Stations */}
                {STATION_NODES.map(node => {
                    const isSelected = selectedStation === node.name;
                    const isHovered = hoveredStation === node.name;
                    const isRelatedLine = node.line === selectedLine;

                    return (
                        <g
                            key={node.id}
                            onClick={() => onStationSelect(node.name, node.line)}
                            onMouseEnter={() => setHoveredStation(node.name)}
                            onMouseLeave={() => setHoveredStation(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* 역 원형 마커 */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? 10 : isHovered ? 8 : 6}
                                fill={isRelatedLine || isSelected ? '#fff' : '#eee'}
                                stroke={LINE_COLORS[node.line]}
                                strokeWidth={isSelected ? 4 : 2}
                                style={{ transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                            />

                            {/* 역 이름 라벨 */}
                            {(isSelected || isHovered || isRelatedLine) && (
                                <text
                                    x={node.x}
                                    y={node.y + 20}
                                    textAnchor="middle"
                                    fill="#333"
                                    fontSize={isSelected ? "14" : "11"}
                                    fontWeight={isSelected ? "bold" : "normal"}
                                    style={{
                                        pointerEvents: 'none',
                                        textShadow: '0 1px 4px rgba(255,255,255,0.8)'
                                    }}
                                >
                                    {node.name}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#666',
                maxWidth: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                * 데모를 위해 주요 역 위주로 간소화된 노선도입니다.
            </div>
        </div>
    );
}
