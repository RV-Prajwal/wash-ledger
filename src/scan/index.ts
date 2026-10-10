import { createDetector } from './detector';
import type { Detector } from './detector';
import { createReader } from './reader';
import type { Reader } from './reader';
import { normalizePlate, isValidPlate } from './normalize';
import { createVoteState, addVote } from './vote';
import type { VoteState } from './vote';

export const TWO_LINE_ASPECT_RATIO_THRESHOLD = 2.2;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export interface AcceptedPlate {
  text: string;
  isLowConfidence: boolean;
}

export class ScanPipeline {
  private detector: Detector;
  private reader: Reader;
  private voteState: VoteState;
  private consecutiveFailures = 0;
  
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
    this.consecutiveFailures = 0;
  }

  async processFrame(canvas: HTMLCanvasElement): Promise<AcceptedPlate | null> {
    try {
      const box = await this.detector.detect(canvas);
      if (!box) {
        this.consecutiveFailures = 0;
        return null; // No plate detected in this frame
      }

      const aspectRatio = box.width / box.height;
      const isTwoLine = aspectRatio < TWO_LINE_ASPECT_RATIO_THRESHOLD;
      
      let bestResult: any = null;
      let validSingle = false;
      let validSplit = false;
      
      // Always try reading it as single line
      const singleLineResult = await this.reader.read(canvas, box);
      const normalizedSingle = singleLineResult ? normalizePlate(singleLineResult.text) : null;
      validSingle = normalizedSingle ? isValidPlate(normalizedSingle) : false;
      
      let splitResult: any = null;
      let normalizedSplit: string | null = null;
      
      if (isTwoLine) {
        // Split with 5% overlap
        const hTop = box.height * 0.55;
        const hBottom = box.height * 0.55;
        const topBox = { ...box, height: hTop };
        const bottomBox = { ...box, y: box.y + box.height * 0.45, height: hBottom };
        
        const topRead = await this.reader.read(canvas, topBox);
        const bottomRead = await this.reader.read(canvas, bottomBox);
        
        if (topRead && bottomRead) {
          splitResult = {
            text: topRead.text + bottomRead.text,
            confidences: [...topRead.confidences, ...bottomRead.confidences]
          };
          normalizedSplit = normalizePlate(splitResult.text);
          validSplit = isValidPlate(normalizedSplit);
        }
      } else {
        // Vertical Split for Single-Line plates
        // Since model has a 9-slot limit, a 10-char single line plate gets garbled.
        // We split it vertically at 52% width (slight overlap) into two ~2:1 crops.
        const wLeft = box.width * 0.52;
        const wRight = box.width * 0.52;
        const leftBox = { ...box, width: wLeft };
        const rightBox = { ...box, x: box.x + box.width * 0.48, width: wRight };

        const leftRead = await this.reader.read(canvas, leftBox);
        const rightRead = await this.reader.read(canvas, rightBox);

        if (leftRead && rightRead) {
          splitResult = {
            text: leftRead.text + rightRead.text,
            confidences: [...leftRead.confidences, ...rightRead.confidences]
          };
          normalizedSplit = normalizePlate(splitResult.text);
          validSplit = isValidPlate(normalizedSplit);
        }
      }

      // Choose result
      if (isTwoLine) {
        if (validSplit) {
          bestResult = splitResult;
        } else if (validSingle) {
          bestResult = singleLineResult;
        } else if (splitResult) {
          bestResult = splitResult;
        } else {
          bestResult = singleLineResult;
        }
      } else {
        if (validSingle) {
          bestResult = singleLineResult;
        } else if (validSplit) {
          bestResult = splitResult;
        } else if (splitResult) {
          bestResult = splitResult;
        } else {
          bestResult = singleLineResult;
        }
      }

      if (!bestResult) {
        this.consecutiveFailures = 0;
        return null;
      }

      this.consecutiveFailures = 0;

      const normalized = normalizePlate(bestResult.text);
      const isLowConfidence = bestResult.confidences.some((c: number) => c < LOW_CONFIDENCE_THRESHOLD);
      
      const { newState, acceptedPlate } = addVote(this.voteState, normalized);
      this.voteState = newState;
      
      return acceptedPlate ? { text: acceptedPlate, isLowConfidence } : null;
    } catch (err: any) {
      console.warn("Inference failed for frame:", err);
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= 3) {
        throw new Error("Failed to read plate (model error). Please enter manually.");
      }
      return null;
    }
  }
}

// Singleton instance to be loaded once at app start
export const pipeline = new ScanPipeline();
