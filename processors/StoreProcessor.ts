import { Configuration } from "./Configuration.js";
import { ProcessingUnit,Processor } from "./Processor.js";
import fs from 'fs';

export class StoreProcessor extends Processor {
  private filterFileName(pu: ProcessingUnit): boolean {
    return pu.name.match(/\d+_de_(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/)?.index !== 0;
  }

  private removeWidgetsWithoutMain(pu: ProcessingUnit): boolean {
    if (pu.name.endsWith('_widgets')) {
      const mainName = pu.name.split('_widgets')![0];
      if (!fs.existsSync(`${Configuration.outDir}${mainName}`)) {
        return false;
      }
    }

    return true;
  }

  private removeSamllFiles(pu: ProcessingUnit) {
    return pu.content.length >= 200;
  }

  private filters: ((pu: ProcessingUnit) => boolean)[] = [
    this.filterFileName.bind(this),
    this.removeWidgetsWithoutMain.bind(this),
    this.removeSamllFiles.bind(this)
  ];

  override run(pu: ProcessingUnit): ProcessingUnit[] {
    let show = true;
    for (const filter of this.filters) {
      show = show && filter(pu);
    }

    if (show) {
      fs.writeFileSync(`${Configuration.outDir}${pu.name}`,pu.content);
    }

    return [];
  }
}