import React, { useState, useMemo } from 'react';

export interface MatrixRow {
  code: string;
  name: string;
  region: string;
  scores: number[]; // 10 timeframes: 5M, 10M, 15M, 1H, 2H, 3H, 4H, 6H, 8H, 1D
}

const TIMEFRAMES = ['5M', '10M', '15M', '1H', '2H', '3H', '4H', '6H', '8H', '1D'];

const GROUPS = [
  { name: 'SCALPING', short: 'Scalp', key: 'scalp', ids: [0, 1, 2] },
  { name: 'INTRADAY', short: 'Intraday', key: 'intra', ids: [3, 4, 5] },
  { name: 'SWING & MAKRO', short: 'Swing', key: 'swing', ids: [6, 7, 8, 9] },
];

const INITIAL_ROWS: MatrixRow[] = [
  { code: 'USD', name: 'US Dollar', region: 'US', scores: [6.62, 6.62, 6.62, 6.62, 6.62, 6.62, 6.62, 6.62, 6.62, 6.62] },
  { code: 'EUR', name: 'Euro', region: 'EU', scores: [1.77, 1.77, 1.77, 1.77, 1.77, 1.77, 1.77, 1.77, 1.77, 1.77] },
  { code: 'GBP', name: 'British Pound', region: 'GB', scores: [2.85, 2.85, 2.85, 2.85, 2.85, 2.85, 2.85, 2.85, 2.85, 2.85] },
  { code: 'JPY', name: 'Japanese Yen', region: 'JP', scores: [1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15] },
  { code: 'CHF', name: 'Swiss Franc', region: 'CH', scores: [9.80, 9.80, 9.80, 9.80, 9.80, 9.80, 9.70, 9.80, 9.80, 9.80] },
  { code: 'AUD', name: 'Australian Dollar', region: 'AU', scores: [8.64, 8.64, 8.64, 8.64, 8.64, 8.64, 8.64, 8.64, 8.64, 8.64] },
  { code: 'CAD', name: 'Canadian Dollar', region: 'CA', scores: [6.40, 6.40, 6.40, 6.40, 6.40, 6.40, 6.40, 6.40, 6.40, 6.40] },
  { code: 'NZD', name: 'New Zealand Dollar', region: 'NZ', scores: [1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65] },
];

export const formatDec = (v: number) => v.toFixed(2).replace('.', ',');

export const getScoreLevel = (v: number): 'strong' | 'bull' | 'neutral' | 'weak' | 'bear' => {
  if (v >= 7.5) return 'strong';
  if (v >= 5.8) return 'bull';
  if (v >= 4.2) return 'neutral';
  if (v >= 2.5) return 'weak';
  return 'bear';
};

export const getScoreDir = (v: number): 'bull' | 'bear' | 'neutral' => {
  if (v >= 5.8) return 'bull';
  if (v < 4.2) return 'bear';
  return 'neutral';
};

export const LEVEL_NAMES: Record<string, string> = {
  strong: 'Kuat bullish',
  bull: 'Bullish moderat',
  neutral: 'Netral',
  weak: 'Lemah / bearish',
  bear: 'Kuat bearish',
};

export default function MultiTimeframeMatrix() {
  const [horizon, setHorizon] = useState<'all' | 'scalp' | 'intra' | 'swing'>('all');
  const [filterDir, setFilterDir] = useState<'all' | 'bull' | 'bear' | 'neutral'>('all');
  const [sortBy, setSortBy] = useState<'original' | 'strong' | 'weak' | 'name'>('original');
  const [query, setQuery] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('CHF');
  const [selectedCellIdx, setSelectedCellIdx] = useState<number>(6); // 4H default
  const [isSolo, setIsSolo] = useState<boolean>(false);

  // Active indices of timeframes
  const activeIds = useMemo(() => {
    if (horizon === 'all') return TIMEFRAMES.map((_, i) => i);
    const grp = GROUPS.find(g => g.key === horizon);
    return grp ? grp.ids : TIMEFRAMES.map((_, i) => i);
  }, [horizon]);

  // Average score for row across given indices
  const getAvg = (row: MatrixRow, ids: number[] = activeIds) => {
    return ids.reduce((sum, i) => sum + row.scores[i], 0) / ids.length;
  };

  // Alignment calculation
  const getAlignment = (row: MatrixRow) => {
    const counts = { bull: 0, bear: 0, neutral: 0 };
    activeIds.forEach(i => {
      counts[getScoreDir(row.scores[i])]++;
    });
    const win = (Object.keys(counts) as Array<'bull' | 'bear' | 'neutral'>).sort(
      (a, b) => counts[b] - counts[a]
    )[0];
    const total = activeIds.length;
    const isFull = counts[win] === total;
    const label = isFull
      ? win === 'bull'
        ? 'Bullish penuh'
        : win === 'bear'
        ? 'Bearish penuh'
        : 'Netral penuh'
      : 'Campuran';
    return { win, count: counts[win], total, counts, label };
  };

  // Global overview metrics
  const sortedByAvg = useMemo(() => {
    return [...INITIAL_ROWS].sort((a, b) => getAvg(b, activeIds) - getAvg(a, activeIds));
  }, [activeIds]);

  const strongestRow = sortedByAvg[0];
  const weakestRow = sortedByAvg[sortedByAvg.length - 1];

  const bullCount = useMemo(() => {
    return INITIAL_ROWS.filter(r => {
      const a = getAlignment(r);
      return a.counts.bull === activeIds.length;
    }).length;
  }, [activeIds]);

  const bearCount = useMemo(() => {
    return INITIAL_ROWS.filter(r => {
      const a = getAlignment(r);
      return a.counts.bear === activeIds.length;
    }).length;
  }, [activeIds]);

  // Filtered & sorted rows for table
  const displayedRows = useMemo(() => {
    let list = INITIAL_ROWS.filter(r => {
      const matchesQuery = (r.code + ' ' + r.name).toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (isSolo && r.code !== selectedCurrency) return false;
      if (filterDir !== 'all') {
        const a = getAlignment(r);
        if (a.counts[filterDir] <= activeIds.length / 2) return false;
      }
      return true;
    });

    if (sortBy === 'strong') {
      list.sort((a, b) => getAvg(b, activeIds) - getAvg(a, activeIds));
    } else if (sortBy === 'weak') {
      list.sort((a, b) => getAvg(a, activeIds) - getAvg(b, activeIds));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.code.localeCompare(b.code));
    }

    return list;
  }, [query, isSolo, selectedCurrency, filterDir, sortBy, activeIds]);

  // Current selected row & detail
  const currentRow = INITIAL_ROWS.find(r => r.code === selectedCurrency) || INITIAL_ROWS[0];
  const safeCellIdx = activeIds.includes(selectedCellIdx) ? selectedCellIdx : activeIds[0];
  const currentCellScore = currentRow.scores[safeCellIdx];
  const currentLevel = getScoreLevel(currentCellScore);
  const currentAlignment = getAlignment(currentRow);

  const activeGroups = GROUPS.filter(g => g.ids.some(i => activeIds.includes(i)));

  // Reset all filters
  const handleReset = () => {
    setHorizon('all');
    setFilterDir('all');
    setSortBy('original');
    setQuery('');
    setIsSolo(false);
  };

  return (
    <div className="matrix-component-root">
      {/* Section Intro */}
      <div className="intro">
        <div>
          <div className="eyebrow">CURRENCY INTELLIGENCE / CONFLUENCE</div>
          <h1>Satu matriks. Sepuluh perspektif.</h1>
          <p>Bandingkan kekuatan mata uang dari scalping hingga horizon harian.</p>
        </div>
        <p className="hint">
          Klik nilai untuk detail.<br />
          Klik mata uang untuk memilih; klik dua kali untuk solo.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <section className="overview">
        <div className="stat">
          <label>Mata uang terkuat</label>
          <div className="value positive">
            {strongestRow.code}
            <small>{formatDec(getAvg(strongestRow, activeIds))} / 10</small>
          </div>
          <p>Rata-rata {activeIds.length} timeframe aktif</p>
        </div>

        <div className="stat">
          <label>Mata uang terlemah</label>
          <div className="value negative">
            {weakestRow.code}
            <small>{formatDec(getAvg(weakestRow, activeIds))} / 10</small>
          </div>
          <p>Rata-rata {activeIds.length} timeframe aktif</p>
        </div>

        <div className="stat">
          <label>Selaras bullish</label>
          <div className="value">
            {bullCount}
            <small>/ 8 mata uang</small>
          </div>
          <p>Seluruh timeframe aktif ≥ 5,8</p>
        </div>

        <div className="stat">
          <label>Selaras bearish</label>
          <div className="value">
            {bearCount}
            <small>/ 8 mata uang</small>
          </div>
          <p>Seluruh timeframe aktif &lt; 4,2</p>
        </div>
      </section>

      {/* Main Matrix Panel */}
      <section className="panel">
        <div className="panelhead">
          <h2>
            Strength matrix{' '}
            <small>
              {displayedRows.length} mata uang / {activeIds.length} timeframe
            </small>
          </h2>

          <div className="tools">
            <input
              className="search"
              type="search"
              placeholder="Cari mata uang…"
              aria-label="Cari mata uang"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              aria-label="Urutkan mata uang"
            >
              <option value="original">Urutan referensi</option>
              <option value="strong">Terkuat dahulu</option>
              <option value="weak">Terlemah dahulu</option>
              <option value="name">Nama A–Z</option>
            </select>
          </div>
        </div>

        {/* Toolbar with Segmented Buttons */}
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Horizon timeframe">
            <button
              aria-pressed={horizon === 'all'}
              onClick={() => {
                setHorizon('all');
                if (!TIMEFRAMES.map((_, i) => i).includes(safeCellIdx)) {
                  setSelectedCellIdx(0);
                }
              }}
            >
              Semua · 10 TF
            </button>
            <button
              aria-pressed={horizon === 'scalp'}
              onClick={() => {
                setHorizon('scalp');
                setSelectedCellIdx(0);
              }}
            >
              Scalping
            </button>
            <button
              aria-pressed={horizon === 'intra'}
              onClick={() => {
                setHorizon('intra');
                setSelectedCellIdx(3);
              }}
            >
              Intraday
            </button>
            <button
              aria-pressed={horizon === 'swing'}
              onClick={() => {
                setHorizon('swing');
                setSelectedCellIdx(6);
              }}
            >
              Swing & makro
            </button>
          </div>

          <div className="filters" role="group" aria-label="Filter arah">
            <button
              aria-pressed={filterDir === 'all'}
              onClick={() => setFilterDir('all')}
            >
              Semua arah
            </button>
            <button
              aria-pressed={filterDir === 'bull'}
              onClick={() => setFilterDir('bull')}
            >
              Bullish
            </button>
            <button
              aria-pressed={filterDir === 'bear'}
              onClick={() => setFilterDir('bear')}
            >
              Bearish
            </button>
            <button
              aria-pressed={filterDir === 'neutral'}
              onClick={() => setFilterDir('neutral')}
            >
              Netral
            </button>
          </div>
        </div>

        {/* Scope information bar */}
        <div className="scope">
          <span>
            {horizon === 'all'
              ? 'Seluruh horizon'
              : GROUPS.find(g => g.key === horizon)?.name}{' '}
            · Keselarasan dihitung dari {activeIds.length} TF aktif
            {isSolo ? ` · Solo ${selectedCurrency}` : ''}
          </span>
          <button className="clear" onClick={handleReset}>
            Reset filter
          </button>
        </div>

        {/* Matrix Table */}
        <div
          className="tablewrap"
          tabIndex={0}
          role="region"
          aria-label="Matriks kekuatan, geser horizontal untuk semua timeframe"
        >
          <table
            style={{
              minWidth: activeIds.length === 10 ? undefined : activeIds.length === 4 ? '650px' : '590px',
            }}
          >
            <thead>
              <tr className="groups">
                <th className="currencycol" rowSpan={2} scope="col">
                  MATA UANG
                </th>
                {activeGroups.map(g => (
                  <th
                    key={g.key}
                    className={`group ${g.key}`}
                    colSpan={g.ids.length}
                    scope="colgroup"
                  >
                    {g.name}
                  </th>
                ))}
                <th className="confcol" rowSpan={2} scope="col">
                  KESELARASAN
                </th>
              </tr>
              <tr className="tfhead">
                {activeIds.map(i => (
                  <th
                    key={i}
                    scope="col"
                    className={[2, 5].includes(i) ? 'groupend' : ''}
                  >
                    {TIMEFRAMES[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.length > 0 ? (
                displayedRows.map(r => {
                  const a = getAlignment(r);
                  const color = a.win === 'bull' ? 'strong' : a.win === 'bear' ? 'bear' : 'neutral';
                  const isRowSelected = selectedCurrency === r.code;

                  return (
                    <tr key={r.code}>
                      <td className="currencycell">
                        <button
                          className="rowname"
                          onClick={() => setSelectedCurrency(r.code)}
                          onDoubleClick={() => {
                            setSelectedCurrency(r.code);
                            setIsSolo(true);
                          }}
                          aria-label={`Pilih ${r.code}, klik dua kali untuk solo`}
                        >
                          <span className="currencyicon">{r.region}</span>
                          <span>
                            <strong style={{ color: isRowSelected ? 'var(--blue)' : 'var(--ink)' }}>
                              {r.code}
                            </strong>
                            <small>{r.name}</small>
                          </span>
                        </button>
                      </td>

                      {activeIds.map(i => {
                        const scoreVal = r.scores[i];
                        const lvl = getScoreLevel(scoreVal);
                        const isCellSelected = isRowSelected && safeCellIdx === i;

                        return (
                          <td
                            key={i}
                            className={`
                              ${[2, 5].includes(i) ? 'groupend' : ''}
                              ${[3, 6].includes(i) ? 'groupstart' : ''}
                            `}
                          >
                            <button
                              className={`cell ${lvl}`}
                              aria-pressed={isCellSelected}
                              onClick={() => {
                                setSelectedCurrency(r.code);
                                setSelectedCellIdx(i);
                              }}
                              aria-label={`${r.code}, ${TIMEFRAMES[i]}, skor ${formatDec(scoreVal)}, ${LEVEL_NAMES[lvl]}`}
                            >
                              {formatDec(scoreVal)}
                            </button>
                          </td>
                        );
                      })}

                      <td className="confluence">
                        <strong style={{ color: `var(--${color})` }}>
                          <span>
                            {a.win === 'bull' ? '↗' : a.win === 'bear' ? '↘' : '−'} {a.label}
                          </span>
                          <span>
                            {a.count}/{a.total}
                          </span>
                        </strong>
                        <div className="units" aria-hidden="true">
                          {activeIds.map(i => {
                            const d = getScoreDir(r.scores[i]);
                            const uColor = d === 'bull' ? 'var(--strong)' : d === 'bear' ? 'var(--bear)' : 'var(--neutral)';
                            return (
                              <i
                                key={i}
                                style={{ backgroundColor: uColor }}
                              />
                            );
                          })}
                        </div>
                        <small>
                          {a.count === a.total
                            ? 'Seluruh timeframe searah'
                            : 'Arah timeframe berbeda'}
                        </small>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={activeIds.length + 2} className="empty">
                    Tidak ada mata uang yang cocok. Gunakan Reset filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend bar */}
        <div className="legend">
          <div className="legenditems">
            <span className="legenditem">
              <i className="strong" />
              ≥7,5 Kuat bullish
            </span>
            <span className="legenditem">
              <i className="bull" />
              5,8–&lt;7,5 Bullish
            </span>
            <span className="legenditem">
              <i className="neutral" />
              4,2–&lt;5,8 Netral
            </span>
            <span className="legenditem">
              <i className="weak" />
              2,5–&lt;4,2 Lemah
            </span>
            <span className="legenditem">
              <i className="bear" />
              &lt;2,5 Kuat bearish
            </span>
          </div>
          <span className="legendcaption">Skala 0–10 · geser tabel pada layar kecil</span>
        </div>
      </section>

      {/* Selected Item Detail Section */}
      <section className="details" aria-live="polite">
        <div>
          <div className="detailhead">
            DETAIL PILIHAN / {TIMEFRAMES[safeCellIdx]}
          </div>
          <h3>
            {currentRow.code}{' '}
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 400 }}>
              {currentRow.name}
            </span>
          </h3>
          <div className="scorelarge" style={{ color: `var(--${currentLevel})` }}>
            {formatDec(currentCellScore)} <span>/ 10</span>
          </div>
          <p>
            {LEVEL_NAMES[currentLevel]} pada timeframe {TIMEFRAMES[safeCellIdx]}.
            <br />
            Snapshot analitik multi-timeframe terverifikasi.
          </p>
        </div>

        <div className="detailcompare">
          <h4>Rata-rata tiap horizon</h4>
          {GROUPS.map(g => {
            const val = getAvg(currentRow, g.ids);
            const lvl = getScoreLevel(val);
            return (
              <div className="horizontal" key={g.key}>
                <span>{g.short}</span>
                <div className="track">
                  <i
                    style={{
                      width: `${val * 10}%`,
                      backgroundColor: `var(--${lvl})`,
                    }}
                  />
                </div>
                <b>{formatDec(val)}</b>
              </div>
            );
          })}
          <p>Rata-rata aritmetika dari sel pada grup.</p>
        </div>

        <div className="detailaction">
          <div>
            <div className="detailhead">KESELARASAN AKTIF</div>
            <h3 style={{ fontSize: '17px' }}>
              {currentAlignment.label} · {currentAlignment.count}/{currentAlignment.total}
            </h3>
            <p>
              Skor yang konsisten antar-timeframe menunjukkan stabilitas arah momentum pada pasar.
            </p>
          </div>
          <button
            className="btn"
            aria-pressed={isSolo}
            onClick={() => setIsSolo(!isSolo)}
          >
            {isSolo ? 'Tampilkan semua mata uang' : `Solo ${currentRow.code}`}
          </button>
        </div>
      </section>

      {/* Methodology Accordion */}
      <details className="method">
        <summary>Cara membaca keselarasan & sumber data</summary>
        <p>
          Keselarasan dihitung pada timeframe yang sedang ditampilkan: bullish jika skor ≥ 5,8; bearish jika skor &lt; 4,2; selainnya netral. Label “Bullish penuh” atau “Bearish penuh” berarti seluruh timeframe aktif berada pada arah yang sama, bukan probabilitas keberhasilan trading. Warna sel menunjukkan tingkat kekuatan, sementara indikator keselarasan menunjukkan konsistensi arah.
        </p>
        <p>
          Skor mata uang: USD 6,62; EUR 1,77; GBP 2,85; JPY 1,15; CHF 9,80 (4H 9,70); AUD 8,64; CAD 6,40; NZD 1,65. Filter arah memakai mayoritas timeframe aktif; ringkasan atas selalu mencakup delapan mata uang sebelum filter pencarian.
        </p>
      </details>
    </div>
  );
}
