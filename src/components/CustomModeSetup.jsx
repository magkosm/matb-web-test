import React, { useState } from 'react';

const CustomModeSetup = ({ onSave, onCancel }) => {
  // Initial state for task configuration
  const [taskConfig, setTaskConfig] = useState({
    comm: { 
      isActive: true, 
      eventsPerMinute: 2, 
      difficulty: 3 
    },
    monitoring: { 
      isActive: true, 
      eventsPerMinute: 3, 
      difficulty: 3 
    },
    tracking: { 
      isActive: true, 
      eventsPerMinute: 2, 
      difficulty: 3 
    },
    resource: { 
      isActive: true, 
      eventsPerMinute: 2, 
      difficulty: 3 
    }
  });

  // Game duration state (in minutes)
  const [gameDuration, setGameDuration] = useState(5);

  // Handle changes to task configuration
  const handleTaskConfigChange = (task, property, value) => {
    setTaskConfig(prev => ({
      ...prev,
      [task]: {
        ...prev[task],
        [property]: value
      }
    }));
  };

  // Handle duration change
  const handleDurationChange = (e) => {
    setGameDuration(parseInt(e.target.value, 10));
  };

  // Start the game with custom settings
  const handleStartGame = () => {
    onSave({
      taskConfig,
      duration: gameDuration * 60 * 1000 // Convert minutes to milliseconds
    });
  };

  // Task configuration component for a single task
  const TaskConfigItem = ({ task, label, config }) => (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '15px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '10px',
        padding: '8px',
        backgroundColor: config.isActive ? 'rgba(0, 123, 255, 0.2)' : 'rgba(108, 117, 125, 0.2)',
        borderRadius: '4px'
      }}>
        <input 
          type="checkbox" 
          id={`${task}-active`} 
          checked={config.isActive} 
          onChange={(e) => handleTaskConfigChange(task, 'isActive', e.target.checked)}
          style={{ marginRight: '10px' }}
        />
        <label htmlFor={`${task}-active`} style={{ fontWeight: 'bold' }}>
          {label}
        </label>
      </div>

      <div style={{ 
        opacity: config.isActive ? '1' : '0.5',
        pointerEvents: config.isActive ? 'auto' : 'none'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Events Per Minute: {config.eventsPerMinute}
          </label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            step="0.5"
            value={config.eventsPerMinute} 
            onChange={(e) => handleTaskConfigChange(task, 'eventsPerMinute', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Difficulty: {config.difficulty}
          </label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={config.difficulty} 
            onChange={(e) => handleTaskConfigChange(task, 'difficulty', parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      width: '100%',
      height: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: '#1a2a3a',
        borderRadius: '10px',
        padding: '20px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Custom Game Setup</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Game Duration: {gameDuration} minutes
          </label>
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={gameDuration} 
            onChange={handleDurationChange}
            style={{ width: '100%' }}
          />
        </div>
        
        <p style={{ marginBottom: '20px', opacity: '0.8' }}>
          Select which tasks to activate and set their initial difficulty. 
          Once the game starts, difficulty and frequency will increase over time just like in Normal Mode.
        </p>
        
        <TaskConfigItem 
          task="monitoring" 
          label="System Monitoring Task"
          config={taskConfig.monitoring}
        />
        
        <TaskConfigItem 
          task="tracking" 
          label="Tracking Task"
          config={taskConfig.tracking}
        />
        
        <TaskConfigItem 
          task="comm" 
          label="Communications Task"
          config={taskConfig.comm}
        />
        
        <TaskConfigItem 
          task="resource" 
          label="Resource Management Task"
          config={taskConfig.resource}
        />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: '20px' 
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleStartGame}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModeSetup; 