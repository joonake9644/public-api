'use client';

import { useState, useEffect, useCallback } from 'react';
import InteractiveSubwayMap from './InteractiveSubwayMap';

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
    상하구분: string;
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

function getDayOfWeek(): string {
    const day = new Date().getDay();
    if (day === 0) return '일요일';
    if (day === 6) return '토요일';
    return '평일';
}

function getDirectionOptions(line: string): string[] {
    if (line === '2호선') return ['내선', '외선'];
    return ['상선', '하선'];
}

// CSS 스타일 (기존 스타일 유지 + 노선도 관련 추가)
const styles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .line-btn {
    padding: 12px 24px;
    border-radius: 24px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .line-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s;
  }
  .line-btn:hover::before {
    left: 100%;
  }
  .line-btn:hover {
    transform: translateY(-2px) scale(1.02);
  }
  .line-btn:active {
    transform: translateY(0) scale(0.98);
  }
  .card {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideIn 0.4s ease-out;
  }
  .card:hover {
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    transform: translateY(-2px);
  }
  .direction-btn {
    padding: 10px 24px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.25s ease;
  }
  .direction-btn:hover {
    transform: scale(1.05);
  }
  .bar {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .bar:hover {
    transform: scaleY(1.1);
    filter: brightness(1.1);
  }
  .congestion-value {
    transition: all 0.5s ease;
  }
  .station-select {
    transition: all 0.2s ease;
  }
  .station-select:hover {
    border-color: #0071e3;
  }
  .station-select:focus {
    border-color: #0071e3;
    box-shadow: 0 0 0 3px rgba(0,113,227,0.2);
  }
  .legend-item {
    transition: all 0.2s ease;
  }
  .legend-item:hover {
    transform: scale(1.1);
  }
  .retry-btn {
    transition: all 0.2s ease;
  }
  .retry-btn:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
  }
  .retry-btn:active {
    transform: scale(0.95);
  }
  /* 스위치 스타일 */
  .view-switch {
    display: flex;
    background: #e5e5ea;
    padding: 4px;
    border-radius: 16px;
    margin-bottom: 24px;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }
  .view-btn {
    padding: 8px 20px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
    background: transparent;
    color: #8e8e93;
  }
  .view-btn.active {
    background: #fff;
    color: #1d1d1f;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
`;

export default function SubwayPage() {
    const [selectedLine, setSelectedLine] = useState<string>('1호선');
    const [stations, setStations] = useState<string[]>([]);
    const [selectedStation, setSelectedStation] = useState<string>('');
    const [direction, setDirection] = useState<string>('상선');
    const [congestionData, setCongestionData] = useState<CongestionRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allData, setAllData] = useState<CongestionRecord[]>([]);
    const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [hoveredBar, setHoveredBar] = useState<string | null>(null);
    const [currentDay, setCurrentDay] = useState<string>('평일');
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    const loadAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/subway/congestion?page=1&perPage=2000');
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
        setCurrentDay(getDayOfWeek());
    }, [loadAllData]);

    useEffect(() => {
        const directions = getDirectionOptions(selectedLine);
        setDirection(directions[0]);
    }, [selectedLine]);

    useEffect(() => {
        if (allData.length > 0) {
            let filtered = allData.filter(r => r.호선 === selectedLine);
            const hasDayInfo = filtered.some(r => r.요일구분);
            if (hasDayInfo) {
                const dayFiltered = filtered.filter(r => r.요일구분 === currentDay);
                if (dayFiltered.length > 0) {
                    filtered = dayFiltered;
                } else if (currentDay !== '평일') {
                    const weekday = filtered.filter(r => r.요일구분 === '평일');
                    if (weekday.length > 0) filtered = weekday;
                }
            }

            const lineStations = [...new Set(filtered.map(r => r.출발역))];
            setStations(lineStations.sort());

            if (lineStations.length > 0) {
                if (!selectedStation || !lineStations.includes(selectedStation)) {
                    setSelectedStation(lineStations[0]);
                }
            } else {
                setSelectedStation('');
            }
        }
    }, [selectedLine, allData, currentDay, selectedStation]);

    useEffect(() => {
        if (allData.length > 0 && selectedStation) {
            let record = allData.find(
                r => r.호선 === selectedLine &&
                    r.출발역 === selectedStation &&
                    r.상하구분 === direction &&
                    (r.요일구분 ? r.요일구분 === currentDay : true)
            );

            if (!record && currentDay !== '평일') {
                record = allData.find(
                    r => r.호선 === selectedLine &&
                        r.출발역 === selectedStation &&
                        r.상하구분 === direction &&
                        r.요일구분 === '평일'
                );
            }

            setCongestionData(record || null);
        } else {
            setCongestionData(null);
        }
    }, [selectedLine, selectedStation, direction, allData, currentDay]);

    const handleMapStationSelect = (stationName: string, line: string) => {
        setSelectedLine(line);
        setSelectedStation(stationName);
        // 방향은 기본값(상선/내선)으로 자동 설정되므로 그대로 둠
    };

    const currentCongestion = congestionData && currentTimeSlot
        ? parseFloat(String(congestionData[currentTimeSlot] || '0'))
        : 0;
    const currentLevel = getCongestionLevel(currentCongestion);

    const directionOptions = getDirectionOptions(selectedLine);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: styles }} />
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
            }}>
                <header style={{
                    background: 'rgba(255,255,255,0.72)',
                    backdropFilter: 'saturate(180%) blur(20px)',
                    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                    padding: '16px 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}>
                    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h1 style={{ fontSize: '21px', fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
                            🚇 지하철 혼잡도
                        </h1>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#86868b', background: 'rgba(0,0,0,0.04)', padding: '6px 12px', borderRadius: '20px' }}>
                                {currentDay} 기준
                            </span>
                            <span style={{ fontSize: '13px', color: '#86868b', background: 'rgba(0,0,0,0.04)', padding: '6px 12px', borderRadius: '20px' }}>
                                실시간
                            </span>
                        </div>
                    </div>
                </header>

                <main style={{ maxWidth: '980px', margin: '0 auto', padding: '24px' }}>
                    {/* 뷰 모드 스위치 */}
                    <div className="view-switch">
                        <button
                            className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
                            onClick={() => setViewMode('map')}
                        >
                            노선도 보기
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            목록 선택
                        </button>
                    </div>

                    {/* 노선도 섹션 */}
                    {viewMode === 'map' && (
                        <section style={{ marginBottom: '32px', animation: 'slideIn 0.3s ease-out' }}>
                            <InteractiveSubwayMap
                                selectedLine={selectedLine}
                                selectedStation={selectedStation}
                                onStationSelect={handleMapStationSelect}
                            />
                            <p style={{ textAlign: 'center', fontSize: '13px', color: '#86868b', marginTop: '12px' }}>
                                역을 클릭하여 혼잡도를 확인하세요.
                            </p>
                        </section>
                    )}

                    {viewMode === 'list' && (
                        <section style={{ marginBottom: '24px', animation: 'slideIn 0.3s ease-out' }}>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {LINES.map(line => {
                                    const isSelected = selectedLine === line;
                                    const isHovered = hoveredLine === line;
                                    return (
                                        <button
                                            key={line}
                                            className="line-btn"
                                            onClick={() => setSelectedLine(line)}
                                            onMouseEnter={() => setHoveredLine(line)}
                                            onMouseLeave={() => setHoveredLine(null)}
                                            style={{
                                                background: isSelected ? LINE_COLORS[line] : isHovered ? `${LINE_COLORS[line]}15` : '#fff',
                                                color: isSelected ? '#fff' : LINE_COLORS[line],
                                                boxShadow: isSelected ? `0 6px 20px ${LINE_COLORS[line]}50` : '0 2px 8px rgba(0,0,0,0.06)',
                                                border: isSelected ? 'none' : `2px solid ${isHovered ? LINE_COLORS[line] : 'transparent'}`,
                                            }}
                                        >
                                            {line}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* 노선도 모드일 때도 역 선택 드롭다운은 표시하여 보조 수단으로 사용 */}
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#86868b', marginBottom: '8px', fontWeight: 500 }}>
                                    역 선택
                                </label>
                                <select
                                    className="station-select"
                                    value={selectedStation}
                                    onChange={(e) => setSelectedStation(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #d2d2d7',
                                        background: '#fff',
                                        color: '#1d1d1f',
                                        fontSize: '15px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2386868b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 16px center',
                                    }}
                                >
                                    {stations.map(station => (
                                        <option key={station} value={station}>{station}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#86868b', marginBottom: '8px', fontWeight: 500 }}>
                                    방향
                                </label>
                                <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '12px', padding: '4px' }}>
                                    {directionOptions.map(dir => (
                                        <button
                                            key={dir}
                                            className="direction-btn"
                                            onClick={() => setDirection(dir)}
                                            style={{
                                                background: direction === dir ? '#fff' : 'transparent',
                                                color: direction === dir ? '#1d1d1f' : '#86868b',
                                                boxShadow: direction === dir ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                                fontWeight: direction === dir ? 600 : 400,
                                            }}
                                        >
                                            {dir === '상선' ? '↑ 상행' : dir === '하선' ? '↓ 하행' : dir === '내선' ? '↺ 내선' : '↻ 외선'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 로딩, 에러, 혼잡도 카드 등 나머지 동일 코드 유지 (간소화를 위해 상세 코드 반복 생략하지 않고 위와 동일하게 전체 작성됨) */}
                    {loading && (
                        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid #f5f5f7', borderTop: `3px solid ${LINE_COLORS[selectedLine]}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                            <p style={{ color: '#86868b', fontSize: '15px' }}>데이터를 불러오는 중...</p>
                        </div>
                    )}

                    {error && (
                        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
                            <p style={{ color: '#1d1d1f', fontSize: '17px', fontWeight: 500, marginBottom: '8px' }}>연결 오류</p>
                            <p style={{ color: '#86868b', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
                            <button className="retry-btn" onClick={loadAllData} style={{ padding: '12px 28px', background: LINE_COLORS[selectedLine], color: '#fff', border: 'none', borderRadius: '24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>다시 시도</button>
                        </div>
                    )}

                    {congestionData && !loading && currentTimeSlot && (
                        <>
                            <section className="card" style={{ padding: '40px 32px', marginBottom: '20px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-block', padding: '4px 12px', background: `${LINE_COLORS[selectedLine]}15`, color: LINE_COLORS[selectedLine], borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                                    {selectedStation} · {direction}
                                </div>
                                <p style={{ fontSize: '13px', color: '#86868b', marginBottom: '12px', letterSpacing: '0.02em' }}>현재 혼잡도 · {currentTimeSlot.replace('시', ':').replace('분', '')}</p>
                                <div className="congestion-value" style={{ fontSize: '72px', fontWeight: 700, color: currentLevel.color, lineHeight: 1, marginBottom: '16px', letterSpacing: '-0.04em' }}>
                                    {currentCongestion.toFixed(0)}<span style={{ fontSize: '36px', fontWeight: 500, marginLeft: '4px' }}>%</span>
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: `${currentLevel.color}12`, color: currentLevel.color, borderRadius: '24px', fontSize: '15px', fontWeight: 600 }}>
                                    <span style={{ width: '8px', height: '8px', background: currentLevel.color, borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
                                    {currentLevel.level}
                                </span>
                            </section>

                            <section className="card" style={{ padding: '28px', overflow: 'hidden' }}>
                                <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#1d1d1f', marginBottom: '24px' }}>시간대별 혼잡도</h2>
                                <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '180px', minWidth: '700px', padding: '0 8px' }}>
                                        {TIME_SLOTS.map(slot => {
                                            const value = parseFloat(String(congestionData[slot] || '0'));
                                            const level = getCongestionLevel(value);
                                            const height = Math.max((value / 130) * 100, 4);
                                            const isCurrentTime = slot === currentTimeSlot;
                                            const isHovered = hoveredBar === slot;
                                            return (
                                                <div key={slot} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }} onMouseEnter={() => setHoveredBar(slot)} onMouseLeave={() => setHoveredBar(null)}>
                                                    {isHovered && (
                                                        <div style={{ position: 'absolute', bottom: `calc(${height}% + 16px)`, background: '#1d1d1f', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', zIndex: 10, animation: 'slideIn 0.2s ease' }}>
                                                            {slot.replace('시', ':').replace('분', '')} · {value.toFixed(0)}%
                                                        </div>
                                                    )}
                                                    <div className="bar" style={{ width: '100%', height: `${height}%`, background: isCurrentTime ? `linear-gradient(180deg, ${level.color}, ${LINE_COLORS[selectedLine]})` : isHovered ? level.color : `${level.color}70`, borderRadius: '6px 6px 0 0', boxShadow: isCurrentTime ? `0 0 20px ${level.color}60` : isHovered ? `0 4px 12px ${level.color}40` : 'none', cursor: 'pointer' }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: '#86868b', fontWeight: 500, padding: '0 8px' }}>
                                        <span>05:30</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span><span>00:00</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
                                    {[{ label: '여유 (0-50%)', color: '#34C759' }, { label: '보통 (50-80%)', color: '#FF9500' }, { label: '혼잡 (80-100%)', color: '#FF3B30' }, { label: '매우혼잡 (100%+)', color: '#AF52DE' }].map(item => (
                                        <div key={item.label} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                                            <div style={{ width: '10px', height: '10px', background: item.color, borderRadius: '50%', boxShadow: `0 2px 6px ${item.color}40` }} />
                                            <span style={{ fontSize: '12px', color: '#6e6e73', fontWeight: 500 }}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                    {!congestionData && !loading && !error && selectedStation && (
                        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                            <p style={{ color: '#1d1d1f', fontSize: '17px', fontWeight: 500, marginBottom: '8px' }}>데이터 없음</p>
                            <p style={{ color: '#86868b', fontSize: '14px', margin: 0 }}>선택한 조건의 혼잡도 데이터가 없습니다.</p>
                        </div>
                    )}
                </main>
                <footer style={{ textAlign: 'center', padding: '32px 24px', color: '#86868b', fontSize: '12px' }}><p style={{ margin: 0 }}>데이터 출처: 서울교통공사 ODCloud</p></footer>
            </div>
        </>
    );
}
