import React from 'react';
import { useTranslation } from 'react-i18next';

const InstructionOverlay = ({
    title,
    content,
    onStart,
    show
}) => {
    const { t } = useTranslation();

    if (!show) return null;

    // Function to process newlines into paragraphs or line breaks
    const _formatContent = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(5px)',
            pointerEvents: 'auto'
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                color: '#e0e0e0',
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                border: '1px solid #333'
            }}>
                <h2 style={{
                    marginTop: 0,
                    color: '#4fc3f7',
                    borderBottom: '1px solid #333',
                    paddingBottom: '15px',
                    marginBottom: '20px'
                }}>
                    {title}
                </h2>

                <div style={{
                    fontSize: '1.1rem',
                    lineHeight: '1.6',
                    marginBottom: '30px',
                    whiteSpace: 'pre-wrap'
                }}>
                    {content}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={onStart}
                        style={{
                            padding: '12px 30px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            backgroundColor: '#2e7d32',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#1b5e20'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#2e7d32'}
                        autoFocus
                    >
                        {t('instructionsOverlay.ready', 'I Understand - Start')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstructionOverlay;
