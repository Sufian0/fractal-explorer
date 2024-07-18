import React from 'react';
import FractalGenerator from './FractalGenerator';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Fractal Art Generator</h1>
      <FractalGenerator width={800} height={600} />
    </div>
  );
};

export default App;