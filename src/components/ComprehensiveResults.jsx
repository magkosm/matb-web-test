import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { downloadCSV } from '../utils/csvExport';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const ComprehensiveResults = ({ results, onReturn }) => {

  // RT Results: step 1
  const rtData = useMemo(() => results[1] || {}, [results]);
  // N-Back Results: steps 2, 3, 4, 5
  const nbackData = useMemo(() => [results[2], results[3], results[4], results[5]].filter(res => res && (res.accuracy !== undefined || res.skipped)), [results]);
  // MATB Results: steps 6, 7
  const matbEasy = useMemo(() => results[6] || {}, [results]);
  const matbHard = useMemo(() => results[7] || {}, [results]);

  // Calculate Total Score
  const totalScore = useMemo(() => {
    let score = 0;

    // RT Score: 1000ms base, minus avg RT, capped at 1000.
    if (rtData.averageReactionTime) {
      score += Math.max(0, 1000 - rtData.averageReactionTime);
    }

    // N-Back Score: Accuracy percentage normalized
    nbackData.forEach(nb => {
      score += (nb.accuracy || 0) * 5; // Up to 500 per level
    });

    // MATB Score: sum of scores
    score += (matbEasy.finalScore || 0) / 10;
    score += (matbHard.finalScore || 0) / 10;

    return Math.floor(score);
  }, [rtData, nbackData, matbEasy, matbHard]);

  const handleExportAll = () => {
    const masterData = [];

    // Add RT
    if (rtData.reactionTimes) {
      rtData.reactionTimes.forEach((time, i) => {
        masterData.push({ Test: 'Reaction Time', Trial: i + 1, Metric: 'RT (ms)', Value: time });
      });
    }

    // Add N-Back
    nbackData.forEach(nb => {
      const label = `${nb.n}-back`;
      masterData.push({ Test: label, Trial: 'Summary', Metric: 'Accuracy', Value: nb.accuracy });
      masterData.push({ Test: label, Trial: 'Summary', Metric: 'Correct', Value: nb.correct });
      masterData.push({ Test: label, Trial: 'Summary', Metric: 'Incorrect', Value: nb.incorrect });
    });

    // Add MATB
    [
      { label: 'MATB Easy', data: matbEasy },
      { label: 'MATB Hard', data: matbHard }
    ].forEach(item => {
      if (item.data.finalScore !== undefined) {
        masterData.push({ Test: item.label, Trial: 'Summary', Metric: 'Score', Value: item.data.finalScore });
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(masterData, `orbital_suite_results_${timestamp}`);
  };

  const nbackChartData = {
    labels: nbackData.map(d => `${d.n}-back`),
    datasets: [{
      label: 'Accuracy %',
      data: nbackData.map(d => d.accuracy),
      backgroundColor: 'rgba(75, 192, 192, 0.6)'
    }]
  };

  return (
    <div style={{
      padding: '40px', backgroundColor: 'rgba(26, 42, 58, 0.95)', color: 'white', minHeight: '100vh', overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'rgba(0,0,0,0.6)', padding: '30px', borderRadius: '12px' }}>
        <h1 style={{ textAlign: 'center' }}>Suite Completion Report</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '30px 0' }}>
          {/* Reaction Time Summary */}
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '8px' }}>
            <h3>Reaction Time</h3>
            <p>Avg: {rtData.averageReactionTime ? rtData.averageReactionTime.toFixed(2) : '--'} ms</p>
            <p>Trials: {rtData.stimuliCount || 0}</p>
          </div>

          {/* MATB Scores */}
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '8px' }}>
            <h3>MATB Performance</h3>
            <p>Easy Score: {matbEasy.finalScore || 0}</p>
            <p>Hard Score: {matbHard.finalScore || 0}</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '30px 0', border: '2px solid gold', padding: '20px', borderRadius: '12px' }}>
          <h2 style={{ color: 'gold', margin: 0 }}>TOTAL ARCHITECTURE SCORE</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{totalScore}</div>
        </div>

        <div style={{ height: '300px', margin: '20px 0' }}>
          <h3>N-Back Accuracy Curve</h3>
          <Bar data={nbackChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
          <button
            onClick={handleExportAll}
            style={{ backgroundColor: '#007bff', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Export All Data (CSV)
          </button>
          <button
            onClick={onReturn}
            style={{ backgroundColor: '#6c757d', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Finish & Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveResults;
