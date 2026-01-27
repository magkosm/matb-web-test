import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { downloadCSV } from '../utils/csvExport';
import MatbResults from './MatbResults';

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
    if (rtData.averageReactionTime && !rtData.skipped) {
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
    nbackData.forEach((nb, idx) => {
      const label = nb.n ? `${nb.n}-back` : `${idx + 1}-back (Skipped)`;
      masterData.push({ Test: label, Trial: 'Summary', Metric: 'Accuracy', Value: nb.accuracy });
      masterData.push({ Test: label, Trial: 'Summary', Metric: 'Correct', Value: nb.correct });
      masterData.push({ Test: label, Trial: 'Summary', Metric: 'Incorrect', Value: nb.incorrect });

      // Add trial-by-trial for N-Back
      if (nb.trialLogs) {
        nb.trialLogs.forEach(trial => {
          masterData.push({
            Test: label,
            Trial: trial.trial,
            Metric: 'Trial Outcome',
            Value: `L:${trial.correctLetter || 'N/A'} P:${trial.correctPosition || 'N/A'}`
          });
          if (trial.letterRT) masterData.push({ Test: label, Trial: trial.trial, Metric: 'Letter RT', Value: trial.letterRT });
          if (trial.positionRT) masterData.push({ Test: label, Trial: trial.trial, Metric: 'Position RT', Value: trial.positionRT });
        });
      }
    });

    // Add MATB
    [
      { label: 'MATB Easy', data: matbEasy },
      { label: 'MATB Hard', data: matbHard }
    ].forEach(item => {
      if (item.data.finalScore !== undefined) {
        masterData.push({ Test: item.label, Trial: 'Summary', Metric: 'Score', Value: item.data.finalScore });
        masterData.push({ Test: item.label, Trial: 'Summary', Metric: 'Game Time (s)', Value: item.data.gameTime });

        // Add detailed logs if available
        if (item.data.trialLogs) {
          const logs = item.data.trialLogs;
          if (logs.comm) logs.comm.forEach((l, i) => masterData.push({ Test: `${item.label} (COMM)`, Trial: i + 1, Metric: l.event || l.type || 'message', Value: l.status || l.callsign || 'logged' }));
          if (logs.monitoring) logs.monitoring.forEach((l, i) => masterData.push({ Test: `${item.label} (MON)`, Trial: i + 1, Metric: l.event || 'indicator', Value: l.status || l.type }));
          if (logs.tracking) logs.tracking.forEach((l, i) => masterData.push({ Test: `${item.label} (TRK)`, Trial: i + 1, Metric: 'Deviation-Max', Value: l.deviation || l.value }));
          if (logs.resource) logs.resource.forEach((l, i) => masterData.push({ Test: `${item.label} (RES)`, Trial: i + 1, Metric: l.event || 'pump', Value: l.status || l.pumpId }));
          if (logs.performance) logs.performance.forEach((l, i) => masterData.push({ Test: `${item.label} (PERF)`, Trial: i + 1, Metric: 'SystemHealth', Value: l.health }));
        }
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(masterData, `orbital_suite_results_${timestamp}`);
  };

  const handleExportRT = () => {
    if (!rtData.reactionTimes || rtData.reactionTimes.length === 0) {
      alert("No Reaction Time data available.");
      return;
    }
    const data = rtData.reactionTimes.map((time, i) => ({
      Trial: i + 1,
      'Reaction Time (ms)': time
    }));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(data, `reaction_time_suite_${timestamp}`);
  };

  const handleExportNBack = (nb) => {
    if (!nb.trialLogs || nb.trialLogs.length === 0) {
      alert(`No ${nb.n || 'N'}-Back data available.`);
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(nb.trialLogs, `nback_${nb.n}_suite_${timestamp}`);
  };

  const handleExportMATB = (matbData, label) => {
    if (!matbData.trialLogs) {
      alert(`No logs available for ${label}.`);
      return;
    }
    const { trialLogs } = matbData;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeLabel = label.toLowerCase().replace(/\s+/g, '_');

    // Trigger multiple downloads to match standalone behavior
    if (trialLogs.comm && trialLogs.comm.length > 0) downloadCSV(trialLogs.comm, `${safeLabel}_comm_log_${timestamp}`);
    if (trialLogs.resource && trialLogs.resource.length > 0) downloadCSV(trialLogs.resource, `${safeLabel}_resource_log_${timestamp}`);
    if (trialLogs.monitoring && trialLogs.monitoring.length > 0) downloadCSV(trialLogs.monitoring, `${safeLabel}_monitoring_log_${timestamp}`);
    if (trialLogs.tracking && trialLogs.tracking.length > 0) downloadCSV(trialLogs.tracking, `${safeLabel}_tracking_log_${timestamp}`);
    if (trialLogs.performance && trialLogs.performance.length > 0) downloadCSV(trialLogs.performance, `${safeLabel}_performance_plots_${timestamp}`);
  };

  const nbackChartData = {
    labels: nbackData.map((d, idx) => d.n ? `${d.n}-back` : `${idx + 1}-back (Skipped)`),
    datasets: [{
      label: 'Accuracy %',
      data: nbackData.map(d => d.accuracy || 0),
      backgroundColor: 'rgba(75, 192, 192, 0.6)'
    }]
  };

  return (
    <div style={{
      padding: '40px', backgroundColor: 'rgba(26, 42, 58, 0.95)', color: 'white', minHeight: '100vh', overflowY: 'auto', maxHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'rgba(0,0,0,0.6)', padding: '30px', borderRadius: '12px' }}>
        <h1 style={{ textAlign: 'center' }}>Suite Completion Report</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '30px 0' }}>
          {/* Reaction Time Summary */}
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '8px' }}>
            <h3>Reaction Time</h3>
            <p>Avg: {rtData.skipped ? 'Skipped' : (rtData.averageReactionTime ? rtData.averageReactionTime.toFixed(2) + ' ms' : '--')}</p>
            <p>Trials: {rtData.stimuliCount || 0}</p>
          </div>

          {/* MATB Scores */}
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '8px' }}>
            <h3>MATB Performance</h3>
            <p>Easy Score: {matbEasy.skipped ? 'Skipped' : (matbEasy.finalScore || 0)}</p>
            <p>Hard Score: {matbHard.skipped ? 'Skipped' : (matbHard.finalScore || 0)}</p>
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

        {/* MATB Easy Results with Plots */}
        {matbEasy.trialLogs && !matbEasy.skipped && (
          <div style={{ margin: '40px 0', borderTop: '2px solid rgba(76, 175, 80, 0.5)', paddingTop: '30px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#4caf50' }}>MATB Easy - Detailed Results</h2>
            <MatbResults 
              logs={matbEasy.trialLogs} 
              finalScore={matbEasy.finalScore || 0} 
            />
          </div>
        )}

        {/* MATB Hard Results with Plots */}
        {matbHard.trialLogs && !matbHard.skipped && (
          <div style={{ margin: '40px 0', borderTop: '2px solid rgba(33, 150, 243, 0.5)', paddingTop: '30px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#2196f3' }}>MATB Hard - Detailed Results</h2>
            <MatbResults 
              logs={matbHard.trialLogs} 
              finalScore={matbHard.finalScore || 0} 
            />
          </div>
        )}

        <div style={{ margin: '40px 0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Detailed Phase Reports</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {/* RT Export */}
            <button
              onClick={handleExportRT}
              disabled={rtData.skipped}
              style={{ padding: '10px', background: 'rgba(156, 39, 176, 0.3)', border: '1px solid #9c27b0', color: 'white', borderRadius: '4px', cursor: rtData.skipped ? 'not-allowed' : 'pointer', fontSize: '12px' }}
            >
              Export RT Trials
            </button>

            {/* N-Back Exports */}
            {nbackData.map((nb, i) => (
              <button
                key={i}
                onClick={() => handleExportNBack(nb)}
                disabled={nb.skipped}
                style={{ padding: '10px', background: 'rgba(255, 152, 0, 0.3)', border: '1px solid #ff9800', color: 'white', borderRadius: '4px', cursor: nb.skipped ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                Export {nb.n ? `${nb.n}-Back` : `Phase ${i + 1}`} Logs
              </button>
            ))}

            {/* MATB Exports */}
            <button
              onClick={() => handleExportMATB(matbEasy, 'MATB Easy')}
              disabled={matbEasy.skipped}
              style={{ padding: '10px', background: 'rgba(76, 175, 80, 0.3)', border: '1px solid #4caf50', color: 'white', borderRadius: '4px', cursor: matbEasy.skipped ? 'not-allowed' : 'pointer', fontSize: '12px' }}
            >
              Export MATB Easy (All)
            </button>
            <button
              onClick={() => handleExportMATB(matbHard, 'MATB Hard')}
              disabled={matbHard.skipped}
              style={{ padding: '10px', background: 'rgba(33, 150, 243, 0.3)', border: '1px solid #2196f3', color: 'white', borderRadius: '4px', cursor: matbHard.skipped ? 'not-allowed' : 'pointer', fontSize: '12px' }}
            >
              Export MATB Hard (All)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
          <button
            onClick={handleExportAll}
            style={{ backgroundColor: '#007bff', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Export MASTER Aggregate (CSV)
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
