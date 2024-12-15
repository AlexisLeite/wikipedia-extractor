import { parseStringPromise } from "xml2js";
import { ProcessingUnit,ProcessingUnitsStream,Processor } from "./Processor.js";

const parseXML = async (xmlData: string): Promise<any> => {
  return await parseStringPromise(xmlData);
};

export class ExtractFromXmlProcessor extends Processor {
  override async run(pu: ProcessingUnit): Promise<ProcessingUnit[]> {
    return new Promise<ProcessingUnit[]>(resolve => {
      parseXML(pu.content).then((result) => {
        resolve([{
          ...pu,
          target: 'SPLIT_WIDGETS',
          content: String(result.page.revision[0].text[0]._)
        }]);
      }).catch((_) => {
        console.error(_);
      });
    });
  }
}
