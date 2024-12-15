import { TProcessor } from "../src/clean.js";

export type ProcessingUnit = {
  content: string;
  name: string;
  target: TProcessor;
};

export type ProcessingUnitStreamListener = (pu: ProcessingUnit) => unknown;

export class ProcessingUnitsStream {
  private cbs: ProcessingUnitStreamListener[] = [];
  private closeCallback: (() => unknown) | null = null;

  hasFinished() {
    return new Promise<void>((resolve) => {
      this.closeCallback = () => {
        resolve();
      };
    });
  }

  onData(cb: ProcessingUnitStreamListener) {
    this.cbs.push(cb);
  }

  write(pu: ProcessingUnit) {
    if (this.closeCallback === null) {
      throw new Error("The stream is not being awaited");
    }
    this.cbs.forEach(c => c(pu));
  }
}

export abstract class Processor {
  abstract run(pu: ProcessingUnit): Promise<ProcessingUnit[]> | ProcessingUnit[];
};