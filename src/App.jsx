import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function App() {
  // --- 状態管理（State） ---
  const [baseInput, setBaseInput] = useState(1200000); // 初期値120万円
  const [isMonthly, setIsMonthly] = useState(false); // false:年額, true:月額
  const [startMonths, setStartMonths] = useState(65 * 12); // 初期値 65歳0ヶ月（月数で管理）

  // --- 計算ロジック ---
  // 1. 基準となる「年額」と「月額」
  const baseYearly = isMonthly ? baseInput * 12 : baseInput;
  const baseMonthly = baseYearly / 12;

  // 2. 選択された年齢と65歳との差分
  const selectedYear = Math.floor(startMonths / 12);
  const selectedMonth = startMonths % 12;
  const diffMonths = startMonths - (65 * 12); // M (マイナスなら繰上げ、プラスなら繰下げ)

  // 3. 増減率の計算
  let rate = 0;
  if (diffMonths < 0) {
    rate = Math.abs(diffMonths) * -0.004; // 繰上げ: 1ヶ月 -0.4%
  } else if (diffMonths > 0) {
    rate = diffMonths * 0.007; // 繰下げ: 1ヶ月 +0.7%
  }

  // 4. 調整後の受給額
  const adjustedYearly = baseYearly * (1 + rate);
  const adjustedMonthly = adjustedYearly / 12;

  // --- 損益分岐点の計算 ---
  const breakEven = useMemo(() => {
    if (diffMonths === 0) return null;
    const diffAmount = adjustedMonthly - baseMonthly;
    if (diffAmount === 0) return null;

    // 累計額が一致する月数を一次方程式で計算
    const breakEvenTotalMonths = ((startMonths * adjustedMonthly) - ((65 * 12) * baseMonthly)) / diffAmount;
    
    // 繰下げの場合、まだ受給開始していない年齢での分岐は除外
    if (diffMonths > 0 && breakEvenTotalMonths <= startMonths) return null;

    return {
      year: Math.floor(breakEvenTotalMonths / 12),
      month: Math.floor(breakEvenTotalMonths % 12)
    };
  }, [diffMonths, startMonths, adjustedMonthly, baseMonthly]);

  // --- グラフ用データの生成 ---
  const chartData = useMemo(() => {
    const data = [];
    for (let age = 60; age <= 95; age++) {
      const ageMonths = age * 12;
      
      // 65歳開始の累計（万円）
      const baseTotalMonths = Math.max(0, ageMonths - (65 * 12));
      const baseTotal = (baseMonthly * baseTotalMonths) / 10000;
      
      // 選択年齢開始の累計（万円）
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

  // --- 画面描画（UI） ---
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>老齢年金 受給額シミュレーター</h1>

      {/* 入力セクション */}
      <div style={{ background: '#f7f9fc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. 基準額（65歳受給時の金額）を入力</h3>
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

        <h3 style={{ marginTop: '20px' }}>2. 受給開始時期を選択 ({selectedYear}歳 {selectedMonth}ヶ月)</h3>
        <input 
          type="range" 
          min={60 * 12} // 60歳0ヶ月
          max={75 * 12} // 75歳0ヶ月
          value={startMonths}
          onChange={(e) => setStartMonths(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '14px' }}>
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
          増減率: {(rate * 100).toFixed(1)} % 
          （65歳比: {diffMonths === 0 ? "±0" : (adjustedYearly - baseYearly > 0 ? "+" : "") + Math.round(adjustedYearly - baseYearly).toLocaleString()} 円/年）
        </div>
      </div>

      {/* グラフセクション */}
      <h3>3. 生涯受給額の推移（損益分岐点）</h3>
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
            <YAxis unit="万円" />
            <Tooltip />
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