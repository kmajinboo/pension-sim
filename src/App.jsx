import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function App() {
  const [baseInput, setBaseInput] = useState(1200000);
  const [isMonthly, setIsMonthly] = useState(false);
  const [startMonths, setStartMonths] = useState(65 * 12);

  const MIN_MONTHS = 60 * 12;
  const MAX_MONTHS = 75 * 12;

  const handleDecrement = () => setStartMonths((prev) => Math.max(MIN_MONTHS, prev - 1));
  const handleIncrement = () => setStartMonths((prev) => Math.min(MAX_MONTHS, prev + 1));

  const baseYearly = isMonthly ? baseInput * 12 : baseInput;
  const baseMonthly = baseYearly / 12;

  const selectedYear = Math.floor(startMonths / 12);
  const selectedMonth = startMonths % 12;
  const diffMonths = startMonths - (65 * 12);

  let rate = 0;
  if (diffMonths < 0) {
    rate = Math.abs(diffMonths) * -0.004;
  } else if (diffMonths > 0) {
    rate = diffMonths * 0.007;
  }

  const adjustedYearly = baseYearly * (1 + rate);
  const adjustedMonthly = adjustedYearly / 12;

  const breakEven = useMemo(() => {
    if (diffMonths === 0) return null;
    const diffAmount = adjustedMonthly - baseMonthly;
    if (diffAmount === 0) return null;

    const breakEvenTotalMonths = ((startMonths * adjustedMonthly) - ((65 * 12) * baseMonthly)) / diffAmount;
    if (diffMonths > 0 && breakEvenTotalMonths <= startMonths) return null;

    return {
      year: Math.floor(breakEvenTotalMonths / 12),
      month: Math.floor(breakEvenTotalMonths % 12)
    };
  }, [diffMonths, startMonths, adjustedMonthly, baseMonthly]);

  const chartData = useMemo(() => {
    const data = [];
    for (let age = 60; age <= 95; age++) {
      const ageMonths = age * 12;
      const baseTotalMonths = Math.max(0, ageMonths - (65 * 12));
      const baseTotal = (baseMonthly * baseTotalMonths) / 10000;
      
      const selectedTotalMonths = Math.max(0, ageMonths - startMonths);
      const selectedTotal = (adjustedMonthly * selectedTotalMonths) / 10000;

      data.push({
        age: `${age}歳`,
        "65歳開始 (基準)": Math.round(baseTotal),
        "選択した年齢": Math.round(selectedTotal),
      });
    }
    return data;
  }, [baseMonthly, adjustedMonthly, startMonths]);

  // --- CSVダウンロード機能 ---
  const handleDownloadCSV = () => {
    // 文字化け防止用BOM（\uFEFF）を追加
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "試算条件・結果サマリー\n";
    csvContent += `基準額(65歳受給額),${baseInput}円 (${isMonthly ? '月額' : '年額'})\n`;
    csvContent += `受給開始時期,${selectedYear}歳${selectedMonth}ヶ月\n`;
    csvContent += `調整後年額,${Math.round(adjustedYearly)}円\n`;
    csvContent += `調整後月額,${Math.round(adjustedMonthly)}円\n`;
    csvContent += `増減比率,${(rate * 100).toFixed(1)}%\n`;
    csvContent += `損益分岐点,${breakEven ? `${breakEven.year}歳${breakEven.month}ヶ月` : 'なし'}\n\n`;
    
    csvContent += "年齢,65歳開始累計(万円),選択年齢開始累計(万円)\n";
    chartData.forEach(row => {
      csvContent += `${row.age},${row["65歳開始 (基準)"]},${row["選択した年齢"]}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `年金シミュレーション_${selectedYear}歳${selectedMonth}ヶ月.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PDF/印刷機能 ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* 印刷用スタイル：印刷時は操作ボタン類を非表示にする */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* ヘッダー＆出力ボタン */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#333', fontSize: '24px' }}>老齢年金 受給額シミュレーター</h1>
        <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleDownloadCSV}
            style={{ padding: '8px 14px', background: '#38a169', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📊 CSV保存
          </button>
          <button 
            onClick={handlePrint}
            style={{ padding: '8px 14px', background: '#4a5568', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🖨️ PDF/印刷
          </button>
        </div>
      </div>

      {/* 入力セクション */}
      <div style={{ background: '#f7f9fc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. 基準額（65歳の受給額）を入力</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="number" 
            value={baseInput} 
            onChange={(e) => setBaseInput(Number(e.target.value))}
            style={{ padding: '8px', fontSize: '16px', width: '200px' }}
          />
          <span>円</span>
          <select 
            value={isMonthly ? "month" : "year"} 
            onChange={(e) => setIsMonthly(e.target.value === "month")}
            style={{ padding: '8px', fontSize: '16px' }}
          >
            <option value="year">年額</option>
            <option value="month">月額</option>
          </select>
        </div>

        <h3 style={{ marginTop: '20px' }}>2. 年金受給開始時期を選択</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <button 
            className="no-print"
            onClick={handleDecrement}
            disabled={startMonths <= MIN_MONTHS}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: '1px solid #cbd5e0',
              background: startMonths <= MIN_MONTHS ? '#edf2f7' : '#ffffff',
              color: startMonths <= MIN_MONTHS ? '#a0aec0' : '#2d3748',
              cursor: startMonths <= MIN_MONTHS ? 'not-allowed' : 'pointer',
              userSelect: 'none'
            }}
          >
            ◀ -1ヶ月
          </button>

          <div style={{
            flex: 1,
            textAlign: 'center',
            background: '#ebf4ff',
            color: '#2b6cb0',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '22px',
            border: '2px solid #bee3f8'
          }}>
            {selectedYear}歳 {selectedMonth}ヶ月
          </div>

          <button 
            className="no-print"
            onClick={handleIncrement}
            disabled={startMonths >= MAX_MONTHS}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: '1px solid #cbd5e0',
              background: startMonths >= MAX_MONTHS ? '#edf2f7' : '#ffffff',
              color: startMonths >= MAX_MONTHS ? '#a0aec0' : '#2d3748',
              cursor: startMonths >= MAX_MONTHS ? 'not-allowed' : 'pointer',
              userSelect: 'none'
            }}
          >
            +1ヶ月 ▶
          </button>
        </div>

        <input 
          className="no-print"
          type="range" 
          min={MIN_MONTHS} 
          max={MAX_MONTHS} 
          value={startMonths}
          onChange={(e) => setStartMonths(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '14px', marginTop: '5px' }}>
          <span>60歳</span>
          <span>65歳</span>
          <span>70歳</span>
          <span>75歳</span>
        </div>
      </div>

      {/* 結果表示セクション */}
      <div style={{ textAlign: 'center', padding: '20px', border: '2px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ margin: '0', color: diffMonths < 0 ? '#e53e3e' : (diffMonths > 0 ? '#3182ce' : '#333') }}>
          調整後年額: {Math.round(adjustedYearly).toLocaleString()} 円
        </h2>
        <p style={{ fontSize: '18px', color: '#555' }}>
          (月額: {Math.round(adjustedMonthly).toLocaleString()} 円)
        </p>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          増減比率: {(rate * 100).toFixed(1)} % 
          （65歳比: {diffMonths === 0 ? "±0" : (adjustedYearly - baseYearly > 0 ? "+" : "") + Math.round(adjustedYearly - baseYearly).toLocaleString()} 円/年）
        </div>
      </div>

      {/* グラフセクション */}
      <h3>3. 生涯年金受給額の経過（損益分岐点）</h3>
      {breakEven && (
        <p style={{ fontWeight: 'bold', color: '#d69e2e', background: '#fffff0', padding: '10px', borderRadius: '5px' }}>
          💡 損益分岐点: {breakEven.year}歳 {breakEven.month}ヶ月で、65歳開始の受給総額を逆転します。
        </p>
      )}
      
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" />
            <YAxis unit="万" />
            <Tooltip formatter={(value) => `${value.toLocaleString()} 万`} />
            <Legend />
            <Line type="monotone" dataKey="65歳開始 (基準)" stroke="#a0aec0" strokeWidth={2} />
            <Line type="monotone" dataKey="選択した年齢" stroke={diffMonths < 0 ? '#e53e3e' : '#3182ce'} strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: '12px', color: '#999', textAlign: 'right' }}>※金額は額面であり、税金や社会保険料は考慮していません。</p>
    </div>
  );
}

export default App;
