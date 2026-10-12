import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { pipeline, TWO_LINE_ASPECT_RATIO_THRESHOLD } from '../scan/index';
import { getUserFriendlyError } from '../utils/errors';

interface TestResult {
  filename: string;
  expected: string;
  actual: string | null;
  timeMs: number;
  isTwoLine: boolean;
  exactMatch: boolean;
  charAccuracy: number;
}

export const TestHarness = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const imagesRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const calculateCharAccuracy = (expected: string, actual: string) => {
    let matches = 0;
    const len = Math.max(expected.length, actual.length);
    if (len === 0) return 0;
    for (let i = 0; i < len; i++) {
      if (expected[i] && actual[i] && expected[i] === actual[i]) {
        matches++;
      }
    }
    return matches / len;
  };

  const parseCsv = async (file: File): Promise<Record<string, string>> => {
    const text = await file.text();
    const lines = text.split('\n');
    const map: Record<string, string> = {};
    for (const line of lines) {
      const [filename, plate] = line.split(',').map(s => s.trim());
      if (filename && plate) {
        map[filename] = plate;
      }
    }
    return map;
  };

  const runTests = async () => {
    setErrorMessage('');
    if (!imagesRef.current?.files?.length || !csvRef.current?.files?.length) {
      setErrorMessage('Please select both test images and a ground-truth CSV file.');
      return;
    }

    setRunning(true);
    setResults([]);
    setProgress(0);

    try {
      const imageFiles = Array.from(imagesRef.current.files);
      const truthMap = await parseCsv(csvRef.current.files[0]);

      await pipeline.init();
      
      const newResults: TestResult[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const expected = truthMap[file.name];
        if (!expected) continue;

        pipeline.reset(); // reset voting state for each image

        // Load image to canvas
        const imgUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = imgUrl;
        });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      // Measure time and check if two-line
      const t0 = performance.now();
      
      // We process the frame up to 5 times to simulate the video loop if it's voting, 
      // but in this harness we just want to see if the pipeline can read it in 1 go,
      // wait, index.ts requires 3 votes! So we must pass the same image 3 times.
      let finalResult: string | null = null;
      for (let j = 0; j < 3; j++) {
        const res = await pipeline.processFrame(canvas);
        if (res) {
          finalResult = res.text;
          break;
        }
      }
      
      const t1 = performance.now();
      
      // Heuristic to check if two-line for stats (assuming the image is tightly cropped? No, pipeline detects.)
      // We can't easily get the detector's box aspect ratio here without mocking. 
      // For now, we'll assume it's two line if it's close to square, but actual detector crop might differ.
      const isTwoLine = img.width / img.height < TWO_LINE_ASPECT_RATIO_THRESHOLD;
      
      const actual = finalResult || '';
      const exactMatch = actual === expected;
      const charAccuracy = calculateCharAccuracy(expected, actual);

      newResults.push({
        filename: file.name,
        expected,
        actual: finalResult,
        timeMs: t1 - t0,
        isTwoLine,
        exactMatch,
        charAccuracy,
      });

      URL.revokeObjectURL(imgUrl);
      setProgress(((i + 1) / imageFiles.length) * 100);
      setResults([...newResults]); // trigger render
    }
  } catch (err: any) {
    setErrorMessage(getUserFriendlyError(err, 'Failed to complete benchmark tests.'));
  } finally {
    setRunning(false);
  }
};

  const singleLine = results.filter(r => !r.isTwoLine);
  const twoLine = results.filter(r => r.isTwoLine);

  const renderStats = (title: string, list: TestResult[]) => {
    if (list.length === 0) return null;
    const exactMatches = list.filter(r => r.exactMatch).length;
    const exactRate = (exactMatches / list.length) * 100;
    const avgCharAcc = list.reduce((sum, r) => sum + r.charAccuracy, 0) / list.length * 100;
    const avgTime = list.reduce((sum, r) => sum + r.timeMs, 0) / list.length;
    
    return (
      <div style={{ padding: '10px', border: '1px solid #ccc', margin: '10px 0' }}>
        <h3>{title} ({list.length} images)</h3>
        <p>Exact Match Rate: {exactRate.toFixed(1)}%</p>
        <p>Character Accuracy: {avgCharAcc.toFixed(1)}%</p>
        <p>Avg Time: {avgTime.toFixed(0)}ms</p>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh', color: '#333' }}>
      <h1>Model Test Harness</h1>

      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#ef4444',
          padding: '10px 14px',
          borderRadius: '8px',
          margin: '14px 0',
          fontWeight: '500'
        }}>
          {errorMessage}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <div>
          <label>Images: </label>
          <input type="file" ref={imagesRef} multiple accept="image/*" />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>Truth CSV (filename,plate): </label>
          <input type="file" ref={csvRef} accept=".csv" />
        </div>
        <button onClick={runTests} disabled={running} style={{ marginTop: '10px', padding: '5px 10px' }}>
          {running ? 'Running...' : 'Run Tests'}
        </button>
        {running && <div style={{ marginTop: '10px' }}>Progress: {progress.toFixed(0)}%</div>}
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {renderStats('Overall', results)}
        {renderStats('Single-line', singleLine)}
        {renderStats('Two-line', twoLine)}
      </div>

      <h3>Mismatches</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#ddd' }}>
            <th style={{ border: '1px solid #999', padding: '4px' }}>File</th>
            <th style={{ border: '1px solid #999', padding: '4px' }}>Expected</th>
            <th style={{ border: '1px solid #999', padding: '4px' }}>Actual</th>
            <th style={{ border: '1px solid #999', padding: '4px' }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {results.filter(r => !r.exactMatch).map(r => (
            <tr key={r.filename}>
              <td style={{ border: '1px solid #999', padding: '4px' }}>{r.filename}</td>
              <td style={{ border: '1px solid #999', padding: '4px' }}>{r.expected}</td>
              <td style={{ border: '1px solid #999', padding: '4px', backgroundColor: '#ffcccc' }}>{r.actual || '(none)'}</td>
              <td style={{ border: '1px solid #999', padding: '4px' }}>{r.isTwoLine ? '2-line' : '1-line'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
