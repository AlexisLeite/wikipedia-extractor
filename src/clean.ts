/**
 * Extracts the widgets from the main content and creates a file for each one.
 */

import fs,{ write } from 'fs';
import { ProcessingUnit,Processor } from '../processors/Processor.js';
import { StartProcessor } from '../processors/StartProcessor.js';
import { StoreProcessor } from '../processors/StoreProcessor.js';
import { MainContentProcessor } from '../processors/MainContentProcessor.js';
import { ExtractFromXmlProcessor } from '../processors/ExtractFromXmlProcessor.js';
import * as readline from 'readline';
import { Configuration } from '../processors/Configuration.js';

export type TProcessor = 'PROCESS_CONTENT' | 'SPLIT_WIDGETS' | 'STORE' | 'EXTRACT_FROM_XML';

const processors: Record<TProcessor,Processor> = {
  PROCESS_CONTENT: new MainContentProcessor(),
  EXTRACT_FROM_XML: new ExtractFromXmlProcessor(),
  SPLIT_WIDGETS: new StartProcessor(),
  STORE: new StoreProcessor(),
};

async function executePipeline(pu: ProcessingUnit) {
  const pus = [pu];
  while (pus.length) {
    const current = pus.shift();
    const processor = processors[current!.target];
    try {
      const newPus = await processor.run(current!);
      pus.unshift(...newPus);
    } catch (e) {
      fs.writeFileSync(Configuration.errorsDir + current!.name,String(e));
    }
  }
}

const path = "D:\\downloads\\eswiki-20241201-pages-articles-multistream1.xml-p1p159400";

const fileSize = putDots(fs.statSync(path).size);
let read = 0;

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g,'') // Remove invalid characters
    .replace(/\s+/g,'_') // Replace spaces with underscores
    .substring(0,255); // Limit length to 255 characters
}

function writeAtCoordinates(x: number,y: number,text: string): void {
  readline.cursorTo(process.stdout,x,y); // Move cursor to specified coordinates
  process.stdout.write(text);            // Write text at the cursor position
}

function putDots(n: number) {
  let ns = String(n);

  let output = '';

  for (let i = 0; i < ns.length; i++) {
    if (i % 3 === 0 && i) {
      output = '.' + output;
    }
    output = ns[ns.length - i - 1] + output;
  }

  return output;
}

async function readFileByLines(filePath: string): Promise<void> {
  try {
    // Create a readable stream from the file
    const fileStream: fs.ReadStream = fs.createReadStream(filePath);

    // Create an interface to read lines
    const rl: readline.Interface = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Recognize all instances of CR LF ('\r\n') as a single line break
    });

    let i = 0;
    let buffer = '';
    let title = '';

    // Read the file line by line
    for await (const line of rl) {
      read += line.length;
      console.log(`Read ${putDots(read)}/${fileSize}`);

      buffer += line + '\n';
      const match = line.match(/<title>([^<]+)<\/title>/);
      if (match?.[0]) {
        title = match[1];
      }
      if (line.match(/<page>/)) {
        buffer = line;
        title = '';
      }
      if (line.match(/<\/page>/)) {
        if (title) {
          i++;
          executePipeline({ content: buffer.toString(),name: `${sanitizeFileName(title)}`,target: 'EXTRACT_FROM_XML' });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading file: ${(error as Error).message}`);
  }
}

console.clear();
console.time("Processing time");
readFileByLines(path);
console.timeEnd("Processing time");
