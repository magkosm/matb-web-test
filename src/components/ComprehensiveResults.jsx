import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

const ComprehensiveResults = ({ 
  finalScore, 
  logs, 
  onExportData, 
  onExportPlots,
  onSaveScore,
  onReturnToMenu,
  showScoreSaveForm
}) => {
  const { t } = useTranslation();

  // Helper to calculate accuracy from logs
  const calculateAccuracy = (taskLogs) => {
    if (!taskLogs || taskLogs.length === 0) return { correct: 0, incorrect: 0, accuracy: 0 };
    
    // Logic depends on log structure for each task
    // Simplified logic: assume 'isCorrect' or similar property exists or derived
    // This is a placeholder logic - needs to be adapted to actual log structure
    
    let correct = 0;
    let total = 0;

    // For simplicity in this demo, we'll estimate based on event types in logs
    // Real implementation should parse specific log formats
    
    // Example for Comm logs (checking if Remarks is HIT)
    if (taskLogs[0].Radio_T !== undefined) {
       correct = taskLogs.filter(l => l.Remarks === 'HIT' || l.Remarks === 'CR').length;
       total = taskLogs.length;
    }
    // Example for Resource logs (checking status)
    else if (taskLogs[0].tankA !== undefined) {
        // Resource is continuous, we can check % of time in optimal range
        correct = taskLogs.filter(l => l.corrA && l.corrB).length;
        total = taskLogs.length;
    }
    // Monitoring logs
    else if (taskLogs[0].type !== undefined) {
        correct = taskLogs.filter(l => l.type === 'HIT').length;
        // Total is hits + misses + false alarms
        total = taskLogs.filter(l => l.type === 'HIT' || l.type === 'MISS' || l.type === 'FA').length;
    }
    // Tracking logs
    else if (taskLogs[0].rmsError !== undefined) {
        // Continuous tracking
        correct = taskLogs.filter(l => l.isWithinTarget).length;
        total = taskLogs.length;
    }

    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    return { correct, incorrect: total - correct, accuracy };
  };

  const commStats = useMemo(() => calculateAccuracy(logs.comm), [logs.comm]);
  const resStats = useMemo(() => calculateAccuracy(logs.resource), [logs.resource]);
  const monStats = useMemo(() => calculateAccuracy(logs.monitoring), [logs.monitoring]);
  const trackStats = useMemo(() => calculateAccuracy(logs.tracking), [logs.tracking]);

  const createPieData = (stats, label) => ({
    labels: ['Success', 'Error'],
    datasets: [
      {
        label: label,
        data: [stats.correct, stats.incorrect],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  });

  const timePlotData = useMemo(() => {
    if (!logs.performance || logs.performance.length === 0) return null;
    const data = logs.performance;
    return {
        labels: data.map(d => {
            const date = new Date(d.time);
            return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
        }),
        datasets: [
            {
                label: 'System Load',
                data: data.map(d => d.systemLoad || 0),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.2,
                yAxisID: 'y',
                pointRadius: 0
            },
            {
                label: 'Health Impact',
                data: data.map(d => d.healthImpact || 0),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.2)',
                fill: true,
                tension: 0.2,
                yAxisID: 'y1', // Use secondary axis if scales differ greatly
                pointRadius: 0
            }
        ]
    };
  }, [logs.performance]);

  const lineOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: 'System Load & Health Over Time',
        color: 'white'
      },
      legend: {
          labels: { color: 'white' }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'System Load', color: 'white' },
        ticks: { color: 'white' },
        min: 0,
        max: 100
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'Health Impact', color: 'white' },
        ticks: { color: 'white' },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
          ticks: { color: 'white' }
      }
    },
  };

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        color: 'white'
    }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>{t('gameOver.title')}</h2>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>{t('gameOver.finalScore')}: {finalScore}</h3>

        {/* Task Accuracy Pies */}
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '30px',
            width: '100%'
        }}>
            {[
                { title: t('tasks.communications.title'), stats: commStats },
                { title: t('tasks.monitoring.title'), stats: monStats },
                { title: t('tasks.tracking.title'), stats: trackStats },
                { title: t('tasks.resource.title'), stats: resStats }
            ].map((item, idx) => (
                <div key={idx} style={{
                    width: '200px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '10px',
                    borderRadius: '8px'
                }}>
                    <h4>{item.title}</h4>
                    <div style={{ position: 'relative', height: '150px' }}>
                        <Doughnut 
                            data={createPieData(item.stats, item.title)} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } }
                            }} 
                        />
                    </div>
                    <p>{Math.round(item.stats.accuracy)}%</p>
                </div>
            ))}
        </div>

        {/* Timeplot */}
        <div style={{
            width: '100%',
            height: '300px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
        }}>
            {timePlotData ? <Line data={timePlotData} options={lineOptions} /> : <p>No performance data</p>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <button onClick={onExportData} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}>
                Export Raw Data
            </button>
            <button onClick={onExportPlots} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}>
                Export Plot Data
            </button>
        </div>

        {/* Score Save or Return */}
        {showScoreSaveForm ? (
             <div style={{ width: '100%', maxWidth: '400px', pointerEvents: 'auto' }}>
                {/* ScoreSaveForm would be rendered here by parent if needed, 
                    or we can pass the props to render it here directly if refactored */}
             </div>
        ) : (
            <button
              onClick={onReturnToMenu}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 30px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              {t('common.returnToMenu')}
            </button>
        )}
    </div>
  );
};

export default ComprehensiveResults;
