import { ProcessingUnit,Processor } from "./Processor.js";

export class NopeProcessor extends Processor {
  override async run(pu: ProcessingUnit): Promise<ProcessingUnit[]> {
    return [];
  }
}