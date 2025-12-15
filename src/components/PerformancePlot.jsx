import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const PerformancePlot = ({ data, title = "System Performance" }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        // No decimation - show all data points and allow scrolling
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
                    tension: 0.2
                },
                {
                    label: 'Health Impact',
                    data: data.map(d => d.healthImpact || 0),
                    borderColor: 'rgb(53, 162, 235)',
                    backgroundColor: 'rgba(53, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.2
                }
            ]
        };
    }, [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: 'white' }
            },
            title: {
                display: !!title,
                text: title,
                color: 'white'
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: { color: 'white' },
                title: {
                    display: true,
                    text: '% Level',
                    color: 'white'
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'white',
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    if (!chartData) return <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>No performance data available</div>;

    return (
        <div style={{
            width: '100%',
            height: '350px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '10px',
            overflowX: 'auto',
            overflowY: 'hidden'
        }}>
            <div style={{
                height: '300px',
                width: `${Math.max(100, data.length * 1.5)}%`,
                minWidth: '100%'
            }}>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default PerformancePlot;
