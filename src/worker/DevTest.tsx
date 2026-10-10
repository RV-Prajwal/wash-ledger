import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { pipeline } from '../scan/index';

export const DevTest = () => {
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFolderSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    setRunning(true);
    setResults([]);
    await pipeline.init();

    const newResults = [];
    let matchCount = 0;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      if (!file.type.startsWith('image/')) continue;

      // Extract expected plate from filename, e.g. "KA03MS6100.jpg"
      const expected = file.name.split('.')[0].toUpperCase();

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => img.onload = r);

      const canvas = canvasRef.current;
      if (!canvas) continue;
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      pipeline.reset();
      const startTime = performance.now();
      
      // Simulate feeding frames (e.g. 5 frames) to see if it accepts
      let accepted: string | null = null;
      for (let f = 0; f < 5; f++) {
        const res = await pipeline.processFrame(canvas);
        if (res) {
          accepted = res.text;
          break;
        }
      }
      
      const timeMs = performance.now() - startTime;
      const match = accepted === expected;
      
      if (match) matchCount++;
      
      newResults.push({
        file: file.name,
        expected,
        accepted: accepted || 'Failed',
        match,
        timeMs: timeMs.toFixed(2)
      });
    }

    setResults(newResults);
    setRunning(false);
  };

  return (
    <div class="container">
      <h2>Dev Test Page: OCR Pipeline</h2>
      
      <div class="glass-panel mb-4">
        <p class="mb-4">Select a folder of photos. The expected plate number should be the filename (e.g. <code>KA03MS6100.jpg</code>).</p>
        <input 
          type="file" 
          /* @ts-ignore */
          webkitdirectory="true" 
          directory="true" 
          multiple 
          onChange={handleFolderSelect} 
          disabled={running}
        />
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      {running && <p>Running pipeline on images...</p>}

      {results.length > 0 && (
        <div class="glass-panel">
          <h3>Results</h3>
          <p class="fw-bold text-success mb-4">Exact match rate: {Math.round((results.filter(r => r.match).length / results.length) * 100)}%</p>
          
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '8px' }}>File</th>
                <th style={{ padding: '8px' }}>Expected</th>
                <th style={{ padding: '8px' }}>Accepted</th>
                <th style={{ padding: '8px' }}>Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)', color: r.match ? 'var(--text-main)' : 'var(--danger)' }}>
                  <td style={{ padding: '8px' }}>{r.file}</td>
                  <td style={{ padding: '8px' }}>{r.expected}</td>
                  <td style={{ padding: '8px' }}>{r.accepted}</td>
                  <td style={{ padding: '8px' }}>{r.timeMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
