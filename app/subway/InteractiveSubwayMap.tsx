'use client';

import React, { useState, useRef, useEffect } from 'react';

// 좌표 및 노드 타입 정의
interface StationNode {
    id: string;
    name: string;
    line: string;
    x: number;
    y: number;
}

interface Link {
    source: string; // ID
    target: string; // ID
    line: string;
    // c1x, c1y, c2x, c2y: 제어점 (베지에 곡선용) - 옵션
    c1x?: number;
    c1y?: number;
}

// 호선별 색상 (Apple Map 스타일)
const LINE_COLORS: Record<string, string> = {
    '1호선': '#0052A4',
    '2호선': '#3CB44A', // 조금 더 밝은 Green
    '3호선': '#EF7C1C',
    '4호선': '#00A5DE',
    '5호선': '#996CAC',
    '6호선': '#CD7C2F',
    '7호선': '#747F00',
    '8호선': '#E6186C',
};

// --- 데이터 정의 (실제 서울 지하철 토폴로지 약식 구현) ---
// 2호선(순환)을 거대한 타원/원형으로 배치하고, 1호선이 관통하는 형태
const STATION_NODES: StationNode[] = [
    // 1호선: 시청(환승) -> 서울역 -> 남영 -> 용산 -> 노량진 -> 대방 -> 신길 -> 영등포
    { id: '101', name: '종각', line: '1호선', x: 450, y: 220 },
    { id: '102', name: '시청', line: '1호선', x: 400, y: 220 }, // 2호선 환승
    { id: '103', name: '서울역', line: '1호선', x: 360, y: 260 },
    { id: '104', name: '남영', line: '1호선', x: 330, y: 300 },
    { id: '105', name: '용산', line: '1호선', x: 300, y: 340 },
    { id: '106', name: '노량진', line: '1호선', x: 250, y: 380 },

    // 2호선: 북측 라인 (을지로 ~ 왕십리)
    { id: '201', name: '시청', line: '2호선', x: 400, y: 220 }, // 1호선과 동일 위치
    { id: '202', name: '을지로입구', line: '2호선', x: 460, y: 200 },
    { id: '203', name: '을지로3가', line: '2호선', x: 520, y: 200 },
    { id: '204', name: '을지로4가', line: '2호선', x: 580, y: 200 },
    { id: '205', name: '동대문역사문화공원', line: '2호선', x: 640, y: 220 },
    { id: '206', name: '신당', line: '2호선', x: 680, y: 260 },
    { id: '207', name: '상왕십리', line: '2호선', x: 700, y: 310 },
    { id: '208', name: '왕십리', line: '2호선', x: 700, y: 360 },
    { id: '209', name: '한양대', line: '2호선', x: 680, y: 410 },
    { id: '210', name: '뚝섬', line: '2호선', x: 640, y: 450 },
    { id: '211', name: '성수', line: '2호선', x: 590, y: 480 },

    // 2호선: 남측 라인 (건대 ~ 강남 ~ 사당)
    { id: '212', name: '건대입구', line: '2호선', x: 620, y: 480 }, // 성수 분기점 표현을 위해 약간 조정
    { id: '216', name: '잠실', line: '2호선', x: 700, y: 520 },
    { id: '222', name: '강남', line: '2호선', x: 550, y: 550 },
    { id: '223', name: '교대', line: '2호선', x: 500, y: 550 },
    { id: '224', name: '서초', line: '2호선', x: 450, y: 550 },
    { id: '226', name: '사당', line: '2호선', x: 350, y: 530 },

    // 2호선: 서측 라인 (신도림 ~ 홍대 ~ 이대)
    { id: '230', name: '신림', line: '2호선', x: 250, y: 500 },
    { id: '234', name: '신도림', line: '2호선', x: 150, y: 400 },
    { id: '239', name: '홍대입구', line: '2호선', x: 180, y: 250 },
    { id: '240', name: '신촌', line: '2호선', x: 230, y: 220 },
    { id: '241', name: '이대', line: '2호선', x: 280, y: 200 },
    { id: '242', name: '아현', line: '2호선', x: 330, y: 200 },
    { id: '243', name: '충정로', line: '2호선', x: 370, y: 210 },
];

const LINKS: Link[] = [
    // 1호선
    { source: '101', target: '102', line: '1호선' },
    { source: '102', target: '103', line: '1호선' }, // 시청 -> 서울역
    { source: '103', target: '104', line: '1호선' },
    { source: '104', target: '105', line: '1호선' },
    { source: '105', target: '106', line: '1호선' },

    // 2호선 순환
    { source: '243', target: '201', line: '2호선' }, // 충정로 -> 시청
    { source: '201', target: '202', line: '2호선' },
    { source: '202', target: '203', line: '2호선' },
    { source: '203', target: '204', line: '2호선' },
    { source: '204', target: '205', line: '2호선' },
    { source: '205', target: '206', line: '2호선' }, // 동대문 -> 신당
    { source: '206', target: '207', line: '2호선' },
    { source: '207', target: '208', line: '2호선' },
    { source: '208', target: '209', line: '2호선' },
    { source: '209', target: '210', line: '2호선' },
    { source: '210', target: '211', line: '2호선' },
    { source: '211', target: '212', line: '2호선' }, // 성수 -> 건대
    { source: '212', target: '216', line: '2호선' }, // 건대 -> 잠실 (축약)
    { source: '216', target: '222', line: '2호선' }, // 잠실 -> 강남 (축약)
    { source: '222', target: '223', line: '2호선' },
    { source: '223', target: '224', line: '2호선' },
    { source: '224', target: '226', line: '2호선' }, // 서초 -> 사당 (축약)
    { source: '226', target: '230', line: '2호선' },
    { source: '230', target: '234', line: '2호선' },
    { source: '234', target: '239', line: '2호선' }, // 신도림 -> 홍대 (축약)
    { source: '239', target: '240', line: '2호선' },
    { source: '240', target: '241', line: '2호선' },
    { source: '241', target: '242', line: '2호선' },
    { source: '242', target: '243', line: '2호선' },
];

interface Props {
    selectedLine: string;
    onStationSelect: (stationName: string, line: string) => void;
    selectedStation: string;
}

export default function InteractiveSubwayMap({ selectedLine, onStationSelect, selectedStation }: Props) {
    const [hoveredStation, setHoveredStation] = useState<string | null>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // 줌/팬 핸들러
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.5, transform.k + scaleAmount), 3);
        setTransform(prev => ({ ...prev, k: newScale }));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - startPan.x,
            y: e.clientY - startPan.y
        }));
    };

    const handleMouseUp = () => setIsDragging(false);

    // SVG 곡선 경로 생성 함수
    const getPathD = (s: StationNode, t: StationNode) => {
        // 간단한 곡선 처리를 위해 중간 제어점 계산 대신 직선+Corner rounding 사용이 애플 스타일스럽지만,
        // 여기서는 부드러운 연결을 위해 Quadratic Bezier 사용
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        // 실제로는 더 복잡한 알고리즘이 필요하지만, 프로토타입에서는 직선에 가까운 부드러운 곡선 적용
        return `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`;
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '600px',
                background: '#fbfbfd', // 매우 연한 그레이 (Apple Map 배경)
                borderRadius: '24px',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <svg
                viewBox="0 0 900 700"
                style={{
                    width: '100%',
                    height: '100%',
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    transformOrigin: '0 0',
                }}
            >
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                        <feOffset dx="1" dy="1" result="offsetblur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Links */}
                {LINKS.map((link, idx) => {
                    const s = STATION_NODES.find(n => n.id === link.source);
                    const t = STATION_NODES.find(n => n.id === link.target);
                    if (!s || !t) return null;

                    const isSelectedLine = link.line === selectedLine;
                    // 비선택 라인은 연하게 처리 (Dimming)
                    const opacity = selectedLine && !isSelectedLine ? 0.2 : 1;
                    const strokeWidth = isSelectedLine ? 8 : 6;

                    return (
                        <g key={`${link.source}-${link.target}`} style={{ opacity, transition: 'opacity 0.4s ease' }}>
                            {/* 메인 라인 */}
                            <path
                                d={`M ${s.x} ${s.y} L ${t.x} ${t.y}`} // 단순화를 위해 직선 사용하되 캡을 둥글게
                                stroke={LINE_COLORS[link.line] || '#ccc'}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                fill="none"
                            />

                            {/* 흐름 애니메이션 (선택된 호선만) */}
                            {isSelectedLine && (
                                <path
                                    d={`M ${s.x} ${s.y} L ${t.x} ${t.y}`}
                                    stroke="#fff"
                                    strokeWidth="2"
                                    strokeDasharray="4 16"
                                    strokeLinecap="round"
                                    fill="none"
                                    style={{ pointerEvents: 'none', opacity: 0.6 }}
                                >
                                    <animate
                                        attributeName="stroke-dashoffset"
                                        from="20"
                                        to="0"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </path>
                            )}
                        </g>
                    );
                })}

                {/* Stations */}
                {STATION_NODES.map(node => {
                    const isSelected = selectedStation === node.name;
                    const isHovered = hoveredStation === node.name;
                    const isRelatedLine = node.line === selectedLine;

                    // 비선택 역은 작게/연하게
                    const opacity = !selectedLine || isRelatedLine ? 1 : 0.3;
                    const r = isSelected ? 8 : (isRelatedLine ? 6 : 4);

                    return (
                        <g
                            key={node.id}
                            onClick={(e) => {
                                e.stopPropagation(); // 드래그 방지
                                onStationSelect(node.name, node.line);
                            }}
                            onMouseEnter={() => setHoveredStation(node.name)}
                            onMouseLeave={() => setHoveredStation(null)}
                            style={{ cursor: 'pointer', opacity, transition: 'opacity 0.4s ease' }}
                        >
                            {/* 역 마커 (Apple Style: 흰색 내부 + 호선색 테두리 + 그림자) */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={r}
                                fill="#fff"
                                stroke={LINE_COLORS[node.line]}
                                strokeWidth={isSelected ? 3.5 : 2.5}
                                filter="url(#shadow)"
                                style={{
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transformBox: 'fill-box',
                                    transformOrigin: 'center'
                                }}
                            />

                            {/* 환승역 표시 (내부 작은 원) */}
                            {(node.name === '시청' || node.name === '왕십리' || node.name === '신도림') && (
                                <circle cx={node.x} cy={node.y} r={r * 0.4} fill={LINE_COLORS[node.line]} />
                            )}

                            {/* 역 이름 (선택되거나 호버되거나 해당 호선일 때 표시) */}
                            {(isSelected || isHovered || isRelatedLine) && (
                                <text
                                    x={node.x}
                                    y={node.y + 24}
                                    textAnchor="middle"
                                    fill="#1d1d1f"
                                    fontSize={isSelected ? "14" : "12"}
                                    fontWeight={isSelected ? "700" : "500"}
                                    style={{
                                        pointerEvents: 'none',
                                        textShadow: '0 2px 4px rgba(255,255,255,0.9)',
                                        fontFamily: '-apple-system, sans-serif'
                                    }}
                                >
                                    {node.name}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* 줌 컨트롤 (미니멀) */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(10px)',
                padding: '8px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <button
                    onClick={(e) => { e.stopPropagation(); setTransform(p => ({ ...p, k: Math.min(p.k + 0.5, 3) })); }}
                    style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#1d1d1f' }}
                >
                    +
                </button>
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.1)' }} />
                <button
                    onClick={(e) => { e.stopPropagation(); setTransform(p => ({ ...p, k: Math.max(p.k - 0.5, 0.5) })); }}
                    style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#1d1d1f' }}
                >
                    -
                </button>
            </div>

            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(20px)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#6e6e73',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
                {selectedLine ? `${selectedLine} 선택됨` : '노선을 선택하세요'}
                {selectedLine === '2호선' && ' (순환)'}
            </div>
        </div>
    );
}
