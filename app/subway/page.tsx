'use client';

import { useState, useEffect, useCallback } from 'react';

// 호선별 색상 정의
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

const LINES = ['1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선'];

const TIME_SLOTS = [
    '5시30분', '6시00분', '6시30분', '7시00분', '7시30분', '8시00분', '8시30분', '9시00분', '9시30분',
    '10시00분', '10시30분', '11시00분', '11시30분', '12시00분', '12시30분', '13시00분', '13시30분',
    '14시00분', '14시30분', '15시00분', '15시30분', '16시00분', '16시30분', '17시00분', '17시30분',
    '18시00분', '18시30분', '19시00분', '19시30분', '20시00분', '20시30분', '21시00분', '21시30분',
    '22시00분', '22시30분', '23시00분', '23시30분', '00시00분', '00시30분',
];

interface CongestionRecord {
    호선: string;
    출발역: string;
    역번호: number;
    상하구분: '상선' | '하선';
    요일구분: string;
    [key: string]: string | number;
}

interface ApiResponse {
    success: boolean;
    data: {
        currentCount: number;
        matchCount: number;
        totalCount: number;
        page: number;
        perPage: number;
        data: CongestionRecord[];
    };
}

function getCongestionLevel(value: number): { level: string; color: string } {
    if (value <= 50) return { level: '여유', color: '#34C759' };
    if (value <= 80) return { level: '보통', color: '#FF9500' };
    if (value <= 100) return { level: '혼잡', color: '#FF3B30' };
    return { level: '매우혼잡', color: '#AF52DE' };
}

function getCurrentTimeSlot(): string {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${hours}시${minutes >= 30 ? '30' : '00'}분`;
}

export default function SubwayPage() {
    const [selectedLine, setSelectedLine] = useState<string>('1호선');
    const [stations, setStations] = useState<string[]>([]);
    const [selectedStation, setSelectedStation] = useState<string>('');
    const [direction, setDirection] = useState<'상선' | '하선'>('상선');
    const [congestionData, setCongestionData] = useState<CongestionRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allData, setAllData] = useState<CongestionRecord[]>([]);
    const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');

    const loadAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/subway/congestion?page=1&perPage=1000');
            const result: ApiResponse = await response.json();
            if (result.success && result.data?.data) {
                setAllData(result.data.data);
            } else {
                setError('데이터를 불러오지 못했습니다.');
            }
        } catch {
            setError('서버에 연결할 수 없습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
        setCurrentTimeSlot(getCurrentTimeSlot());
    }, [loadAllData]);

    useEffect(() => {
        if (allData.length > 0) {
            const lineStations = [...new Set(
                allData.filter(r => r.호선 === selectedLine).map(r => r.출발역)
            )];
            setStations(lineStations);
            if (lineStations.length > 0 && !lineStations.includes(selectedStation)) {
                setSelectedStation(lineStations[0]);
            }
        }
    }, [selectedLine, allData, selectedStation]);

    useEffect(() => {
        if (allData.length > 0 && selectedStation) {
            const record = allData.find(
                r => r.호선 === selectedLine && r.출발역 === selectedStation && r.상하구분 === direction
            );
            setCongestionData(record || null);
        }
    }, [selectedLine, selectedStation, direction, allData]);

    const currentCongestion = congestionData && currentTimeSlot
        ? parseFloat(String(congestionData[currentTimeSlot] || '0'))
        : 0;
    const currentLevel = getCongestionLevel(currentCongestion);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f5f5f7',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
        }}>
            {/* Header */}
            <header style={{
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ maxWidth: '980px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: '#1d1d1f',
                        margin: 0,
                        letterSpacing: '-0.02em',
                    }}>
                        지하철 혼잡도
                    </h1>
                </div>
            </header>

            <main style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem' }}>
                {/* 호선 선택 */}
                <section style={{ marginBottom: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}>
                        {LINES.map(line => (
                            <button
                                key={line}
                                onClick={() => setSelectedLine(line)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease',
                                    background: selectedLine === line ? LINE_COLORS[line] : '#fff',
                                    color: selectedLine === line ? '#fff' : '#1d1d1f',
                                    boxShadow: selectedLine === line
                                        ? `0 4px 12px ${LINE_COLORS[line]}40`
                                        : '0 1px 3px rgba(0,0,0,0.1)',
                                }}
                            >
                                {line}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 역/방향 선택 */}
                <section style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: '180px',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: '1px solid #d2d2d7',
                                background: '#fff',
                                color: '#1d1d1f',
                                fontSize: '15px',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            {stations.map(station => (
                                <option key={station} value={station}>{station}</option>
                            ))}
                        </select>

                        <div style={{
                            display: 'flex',
                            background: '#f5f5f7',
                            borderRadius: '10px',
                            padding: '4px',
                        }}>
                            {(['상선', '하선'] as const).map(dir => (
                                <button
                                    key={dir}
                                    onClick={() => setDirection(dir)}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        background: direction === dir ? '#fff' : 'transparent',
                                        color: direction === dir ? '#1d1d1f' : '#86868b',
                                        boxShadow: direction === dir ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    }}
                                >
                                    {dir === '상선' ? '상행' : '하행'}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 로딩 */}
                {loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#fff',
                        borderRadius: '16px',
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid #f5f5f7',
                            borderTop: '3px solid #0071e3',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 16px',
                        }} />
                        <p style={{ color: '#86868b', fontSize: '15px', margin: 0 }}>불러오는 중...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
                    </div>
                )}

                {/* 에러 */}
                {error && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: '#fff',
                        borderRadius: '16px',
                    }}>
                        <p style={{ color: '#86868b', fontSize: '15px', marginBottom: '16px' }}>{error}</p>
                        <button
                            onClick={loadAllData}
                            style={{
                                padding: '10px 24px',
                                background: '#0071e3',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {/* 혼잡도 카드 */}
                {congestionData && !loading && currentTimeSlot && (
                    <>
                        <section style={{
                            background: '#fff',
                            borderRadius: '16px',
                            padding: '32px',
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}>
                            <p style={{
                                fontSize: '13px',
                                color: '#86868b',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                            }}>
                                현재 혼잡도 · {currentTimeSlot.replace('시', ':').replace('분', '')}
                            </p>
                            <div style={{
                                fontSize: '64px',
                                fontWeight: 700,
                                color: currentLevel.color,
                                lineHeight: 1,
                                marginBottom: '12px',
                                letterSpacing: '-0.03em',
                            }}>
                                {currentCongestion.toFixed(0)}
                                <span style={{ fontSize: '32px', fontWeight: 500 }}>%</span>
                            </div>
                            <span style={{
                                display: 'inline-block',
                                padding: '6px 16px',
                                background: `${currentLevel.color}15`,
                                color: currentLevel.color,
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 600,
                            }}>
                                {currentLevel.level}
                            </span>
                        </section>

                        {/* 시간대별 차트 */}
                        <section style={{
                            background: '#fff',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}>
                            <h2 style={{
                                fontSize: '17px',
                                fontWeight: 600,
                                color: '#1d1d1f',
                                marginBottom: '20px',
                            }}>
                                시간대별 혼잡도
                            </h2>
                            <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '3px',
                                    alignItems: 'flex-end',
                                    height: '160px',
                                    minWidth: '700px',
                                }}>
                                    {TIME_SLOTS.map(slot => {
                                        const value = parseFloat(String(congestionData[slot] || '0'));
                                        const level = getCongestionLevel(value);
                                        const height = Math.max((value / 130) * 100, 4);
                                        const isCurrentTime = slot === currentTimeSlot;

                                        return (
                                            <div
                                                key={slot}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        height: `${height}%`,
                                                        background: isCurrentTime
                                                            ? level.color
                                                            : `${level.color}60`,
                                                        borderRadius: '4px 4px 0 0',
                                                        transition: 'height 0.3s ease',
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '8px',
                                    fontSize: '11px',
                                    color: '#86868b',
                                }}>
                                    <span>05:30</span>
                                    <span>12:00</span>
                                    <span>18:00</span>
                                    <span>00:00</span>
                                </div>
                            </div>

                            {/* 범례 */}
                            <div style={{
                                display: 'flex',
                                gap: '16px',
                                justifyContent: 'center',
                                marginTop: '20px',
                                flexWrap: 'wrap',
                            }}>
                                {[
                                    { label: '여유', color: '#34C759' },
                                    { label: '보통', color: '#FF9500' },
                                    { label: '혼잡', color: '#FF3B30' },
                                    { label: '매우혼잡', color: '#AF52DE' },
                                ].map(item => (
                                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            background: item.color,
                                            borderRadius: '50%',
                                        }} />
                                        <span style={{ fontSize: '12px', color: '#86868b' }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* 데이터 없음 */}
                {!congestionData && !loading && !error && selectedStation && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#fff',
                        borderRadius: '16px',
                    }}>
                        <p style={{ color: '#86868b', fontSize: '15px', margin: 0 }}>
                            선택한 조건의 데이터가 없습니다.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
