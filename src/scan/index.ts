import { createDetector } from './detector';
import type { Detector } from './detector';
import { createReader } from './reader';
import type { Reader } from './reader';
import { normalizePlate } from './normalize';
import { createVoteState, addVote } from './vote';
import type { VoteState } from './vote';

export class ScanPipeline {
  private detector: Detector;
  private reader: Reader;
  private voteState: VoteState;
  
  constructor() {
    this.detector = createDetector();
    this.reader = createReader();
    // Use window of 10, threshold of 3 as per brief
    this.voteState = createVoteState(10, 3);
  }

  async init() {
    await Promise.all([
      this.detector.init(),
      this.reader.init()
    ]);
  }

  reset() {
    this.voteState = createVoteState(10, 3);
  }

  async processFrame(canvas: HTMLCanvasElement): Promise<string | null> {
    const box = await this.detector.detect(canvas);
    if (!box) return null; // No plate detected in this frame

    const rawText = await this.reader.read(canvas, box);
    if (!rawText) return null;

    const normalized = normalizePlate(rawText);
    
    const { newState, acceptedPlate } = addVote(this.voteState, normalized);
    this.voteState = newState;
    
    return acceptedPlate;
  }
}

// Singleton instance to be loaded once at app start
export const pipeline = new ScanPipeline();
