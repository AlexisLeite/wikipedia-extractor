/**
 * Extract the contents of each xml into a txt file.
 */

import fs from 'fs';
import { parseStringPromise } from "xml2js";

const parseXML = async (filePath: string): Promise<any> => {
  const xmlData = fs.readFileSync(filePath,"utf-8");
  return await parseStringPromise(xmlData);
};
const dir = 'D:\\code\\crawlers\\first-crawler\\src\\wiki\\';
const outDir = 'D:\\code\\crawlers\\first-crawler\\src\\extracted\\';

let i = 0;
for (const file of fs.readdirSync(dir)) {
  parseXML(dir + file).then((result) => {
    fs.writeFileSync(outDir + file.replace("xml","txt"),String(result.page.revision[0].text[0]._));
  }).catch((_) => {
  });
  if (i++ == 2000) break;
}

