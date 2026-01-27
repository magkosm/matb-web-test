import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactionTimeTest from './ReactionTimeTest';
import NBackTest from './NBackTest';
import App from '../App';
import ComprehensiveResults from './ComprehensiveResults';
import BackgroundService from '../services/BackgroundService';

const SuiteManager = () => {
    const [step, setStep] = useState(0);
    const [results, setResults] = useState({});
    const finishedStepsRef = useRef(new Set()); // Guard to prevent double-firing handleNext for the same step

    // Steps definition:
    // 0: Introduction
    // 1: Reaction Time (12 stimuli, 1-7s)
    // 2: N-Back 1-back
    // 3: N-Back 2-back
    // 4: N-Back 3-back
    // 5: N-Back 4-back
    // 6: MATB Easy (4 min)
    // 7: MATB Hard (4 min)
    // 8: Comprehensive Results

    useEffect(() => {
        // Apply background
        const currentBackground = BackgroundService.getCurrentBackground();
        const style = BackgroundService.getBackgroundStyle(currentBackground);
        document.body.style.backgroundImage = style.backgroundImage || 'none';
        document.body.style.backgroundColor = style.backgroundColor || '';
        document.body.style.backgroundSize = style.backgroundSize || '';
        document.body.style.backgroundPosition = style.backgroundPosition || '';
        document.body.style.backgroundRepeat = style.backgroundRepeat || '';
    }, []);

    const handleNext = useCallback((stepResults) => {
        if (finishedStepsRef.current.has(step)) {
            console.log(`SuiteManager: Ignoring duplicate handleNext for step ${step}`);
            return;
        }
        finishedStepsRef.current.add(step);

        console.log(`SuiteManager: Step ${step} finished. Moving to ${step + 1}. Results:`, stepResults);
        setResults(prev => ({ ...prev, [step]: stepResults }));
        
        // Add delay between MATB runs to ensure full reset completes
        if (step === 6 || step === 7) {
            // MATB Easy (step 6) or Hard (step 7) just finished - wait for reset
            setTimeout(() => {
                setStep(prev => prev + 1);
            }, 500); // 500ms delay to ensure reset completes
        } else {
            setStep(prev => prev + 1);
        }
    }, [step]);

    const handleReturnToMenu = () => {
        window.location.href = process.env.PUBLIC_URL + '/';
    };

    // Debug Shortcut: Ctrl+Shift+N to skip to next stage
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                console.log(`SuiteManager: Debug skip triggered for step ${step}`);
                if (step >= 2 && step <= 5) {
                    const n = step - 1;
                    handleNext({ skipped: true, n: n, finalScore: 0, accuracy: 0, correct: 0, incorrect: 0, trialLogs: [] });
                } else if (step === 6 || step === 7) {
                    handleNext({ skipped: true, finalScore: 0, gameTime: 240, gameMode: 'custom', trialLogs: { comm: [], resource: [], monitoring: [], tracking: [], performance: [] } });
                } else {
                    handleNext({ skipped: true, finalScore: 0, accuracy: 0, averageReactionTime: 0, stimuliCount: 12, reactionTimes: [] });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [step, handleNext]);

    if (step === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh',
                backgroundColor: 'rgba(26, 42, 58, 0.9)', color: 'white', textAlign: 'center', padding: '20px'
            }}>
                <div style={{ background: 'rgba(0,0,0,0.7)', padding: '40px', borderRadius: '10px', maxWidth: '600px' }}>
                    <h1>Full Orbital Architecture Suite</h1>
                    <p>This suite will guide you through a standardized battery of tests:</p>
                    <ul style={{ textAlign: 'left', marginBottom: '30px' }}>
                        <li>Reaction Time Test (12 stimuli)</li>
                        <li>N-Back Series (1, 2, 3, and 4-back levels)</li>
                        <li>MATB Simulation - Easy Scenario (4 minutes)</li>
                        <li>MATB Simulation - Hard Scenario (4 minutes)</li>
                    </ul>
                    <p>The entire process takes approximately 15-20 minutes. Your results will be summarized at the end.</p>
                    <button
                        onClick={() => setStep(1)}
                        style={{ backgroundColor: '#4CAF50', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px' }}
                    >
                        Begin Suite
                    </button>
                    <div style={{ marginTop: '20px' }}>
                        <button onClick={handleReturnToMenu} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}>
                            Return to Main Menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 1: Reaction Time (3 stimuli for testing)
    if (step === 1) {
        return (
            <ReactionTimeTest
                key={step}
                isSuite={true}
                duration={null} // Force stimuli-based mode
                maxStimuli={3}
                minDelay={1000}
                maxDelay={7000}
                onFinish={handleNext}
                onReturn={handleReturnToMenu}
            />
        );
    }

    // 2-5: N-Back Sequence (6 trials for testing)
    if (step >= 2 && step <= 5) {
        const n = step - 1; // 1, 2, 3, 4
        return (
            <NBackTest
                key={step}
                isSuite={true}
                n={n}
                trials={6}
                dim1targets={2}
                dim2targets={2}
                bothTargets={1}
                tickTime={3000}
                audioEnabled={true}
                onFinish={handleNext}
                onReturn={handleReturnToMenu}
            />
        );
    }

    // 6: MATB Easy (30 seconds for troubleshooting)
    if (step === 6) {
        const easyParams = {
            mode: 'custom',
            duration: 30 * 1000,
            tasks: ['comm', 'monitoring', 'tracking', 'resource'],
            taskConfig: {
                comm: { isActive: true, eventsPerMinute: 1.5, difficulty: 3 },
                monitoring: { isActive: true, eventsPerMinute: 5.0, difficulty: 5 },
                tracking: { isActive: true, eventsPerMinute: 1.5, difficulty: 3 },
                resource: { isActive: true, eventsPerMinute: 2.5, difficulty: 3 }
            }
        };
        return (
            <App
                key={step}
                isSuiteMode={true}
                suiteParams={easyParams}
                onSuiteEnd={handleNext}
            />
        );
    }

    // 7: MATB Hard (30 seconds for troubleshooting)
    if (step === 7) {
        const hardParams = {
            mode: 'custom',
            duration: 30 * 1000,
            tasks: ['comm', 'monitoring', 'tracking', 'resource'],
            taskConfig: {
                comm: { isActive: true, eventsPerMinute: 3.5, difficulty: 7 },
                monitoring: { isActive: true, eventsPerMinute: 9.0, difficulty: 3 }, // More events, less items/complexity per event? Lower difficulty usually means fewer lamps active.
                tracking: { isActive: true, eventsPerMinute: 2.5, difficulty: 6 },
                resource: { isActive: true, eventsPerMinute: 4.5, difficulty: 7 }
            }
        };
        return (
            <App
                key={step}
                isSuiteMode={true}
                suiteParams={hardParams}
                onSuiteEnd={handleNext}
            />
        );
    }

    // 8: Final Results
    if (step === 8) {
        return <ComprehensiveResults results={results} onReturn={handleReturnToMenu} />;
    }

    return null;
};

export default SuiteManager;
