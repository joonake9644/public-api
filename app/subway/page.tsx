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

// 시간대 순서
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

// 혼잡도 수준 계산
function getCongestionLevel(value: number): { level: string; color: string; bgColor: string } {
    if (value <= 50) return { level: '여유', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)' };
    if (value <= 80) return { level: '보통', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)' };
    if (value <= 100) return { level: '혼잡', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.2)' };
    return { level: '매우혼잡', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' };
}

// 현재 시간대 구하기
function getCurrentTimeSlot(): string {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeKey = `${hours}시${minutes >= 30 ? '30' : '00'}분`;
    return timeKey;
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

    // 전체 데이터 로드
    const loadAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/subway/congestion?page=1&perPage=1000');
            const result: ApiResponse = await response.json();
            if (result.success && result.data?.data) {
                setAllData(result.data.data);
            } else {
                setError('데이터를 불러오는데 실패했습니다.');
            }
        } catch {
            setError('서버 연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // 호선 변경 시 역 목록 업데이트
    useEffect(() => {
        if (allData.length > 0) {
            const lineStations = [...new Set(
                allData
                    .filter(record => record.호선 === selectedLine)
                    .map(record => record.출발역)
            )];
            setStations(lineStations);
            if (lineStations.length > 0 && !lineStations.includes(selectedStation)) {
                setSelectedStation(lineStations[0]);
            }
        }
    }, [selectedLine, allData, selectedStation]);

    // 역/방향 변경 시 혼잡도 데이터 업데이트
    useEffect(() => {
        if (allData.length > 0 && selectedStation) {
            const record = allData.find(
                r => r.호선 === selectedLine && r.출발역 === selectedStation && r.상하구분 === direction
            );
            setCongestionData(record || null);
        }
    }, [selectedLine, selectedStation, direction, allData]);

    const currentTimeSlot = getCurrentTimeSlot();
    const currentCongestion = congestionData ? parseFloat(String(congestionData[currentTimeSlot] || '0')) : 0;
    const currentLevel = getCongestionLevel(currentCongestion);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '2rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* 헤더 */}
                <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        🚇 서울 지하철 혼잡도
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
                        실시간 호선별 혼잡도를 확인하세요
                    </p>
                </header>

                {/* 호선 선택 버튼 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
                    {LINES.map(line => (
                        <button
                            key={line}
                            onClick={() => setSelectedLine(line)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '9999px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                background: selectedLine === line ? LINE_COLORS[line] : 'rgba(255,255,255,0.1)',
                                color: selectedLine === line ? '#fff' : '#94a3b8',
                                transform: selectedLine === line ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: selectedLine === line ? `0 4px 20px ${LINE_COLORS[line]}80` : 'none',
                            }}
                        >
                            {line}
                        </button>
                    ))}
                </div>

                {/* 역 선택 및 방향 선택 */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <select
                        value={selectedStation}
                        onChange={(e) => setSelectedStation(e.target.value)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            minWidth: '200px',
                        }}
                    >
                        {stations.map(station => (
                            <option key={station} value={station} style={{ background: '#1a1a2e', color: '#fff' }}>
                                {station}
                            </option>
                        ))}
                    </select>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(['상선', '하선'] as const).map(dir => (
                            <button
                                key={dir}
                                onClick={() => setDirection(dir)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    cursor: 'pointer',
                                    fontWeight: direction === dir ? 'bold' : 'normal',
                                    background: direction === dir ? LINE_COLORS[selectedLine] : 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {dir === '상선' ? '⬆️ 상행' : '⬇️ 하행'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 로딩/에러 상태 */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                        <p>데이터를 불러오는 중...</p>
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '1rem' }}>
                        <p style={{ color: '#EF4444' }}>{error}</p>
                        <button
                            onClick={loadAllData}
                            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {/* 현재 혼잡도 카드 */}
                {congestionData && !loading && (
                    <>
                        <div style={{
                            background: currentLevel.bgColor,
                            border: `2px solid ${currentLevel.color}`,
                            borderRadius: '1rem',
                            padding: '2rem',
                            marginBottom: '2rem',
                            textAlign: 'center',
                        }}>
                            <p style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>현재 시간 ({currentTimeSlot}) 혼잡도</p>
                            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: currentLevel.color }}>
                                {currentCongestion.toFixed(1)}%
                            </div>
                            <div style={{
                                display: 'inline-block',
                                padding: '0.5rem 1rem',
                                background: currentLevel.color,
                                color: '#fff',
                                borderRadius: '9999px',
                                fontWeight: 'bold',
                                marginTop: '0.5rem',
                            }}>
                                {currentLevel.level}
                            </div>
                        </div>

                        {/* 시간대별 차트 */}
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '1rem',
                            padding: '2rem',
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                                📊 시간대별 혼잡도
                            </h2>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '200px', minWidth: '800px' }}>
                                    {TIME_SLOTS.map(slot => {
                                        const value = parseFloat(String(congestionData[slot] || '0'));
                                        const level = getCongestionLevel(value);
                                        const height = Math.min((value / 150) * 100, 100);
                                        const isCurrentTime = slot === currentTimeSlot;

                                        return (
                                            <div
                                                key={slot}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{value.toFixed(0)}%</span>
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        height: `${height}%`,
                                                        background: isCurrentTime
                                                            ? `linear-gradient(180deg, ${level.color}, ${LINE_COLORS[selectedLine]})`
                                                            : level.color,
                                                        borderRadius: '4px 4px 0 0',
                                                        transition: 'height 0.3s',
                                                        boxShadow: isCurrentTime ? `0 0 20px ${level.color}` : 'none',
                                                        border: isCurrentTime ? '2px solid #fff' : 'none',
                                                    }}
                                                />
                                                <span style={{
                                                    fontSize: '0.5rem',
                                                    color: isCurrentTime ? '#fff' : '#64748b',
                                                    fontWeight: isCurrentTime ? 'bold' : 'normal',
                                                    writingMode: 'vertical-rl',
                                                    height: '50px',
                                                }}>
                                                    {slot.replace('시', ':').replace('분', '')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 범례 */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                                {[
                                    { label: '여유 (0-50%)', color: '#10B981' },
                                    { label: '보통 (50-80%)', color: '#F59E0B' },
                                    { label: '혼잡 (80-100%)', color: '#F97316' },
                                    { label: '매우혼잡 (100%+)', color: '#EF4444' },
                                ].map(item => (
                                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '12px', height: '12px', background: item.color, borderRadius: '2px' }} />
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* 역 정보 없을 때 */}
                {!congestionData && !loading && !error && selectedStation && (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
                        <p style={{ color: '#94a3b8' }}>선택한 조건의 혼잡도 데이터가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
