import React from 'react';

const TenseOptions = ({ options, onSelect, isLoading }) => {
  return (
    <div className="tense-options">
      {isLoading ? (
        <div className="loading">Loading options...</div>
      ) : (
        <div className="options-grid">
          {options.map((option, index) => (
            <button
              key={index}
              className="option-button"
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenseOptions; 