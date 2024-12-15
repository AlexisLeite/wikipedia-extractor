/**
 * Takes the original data and splits it in several xml fils, each one including 
 * a wikipedia topic.
 * 
 * The source files can be downloaded from https://wikipedia.c3sl.ufpr.br/eswiki/20241201/.
 */



import * as fs from 'fs';
import * as readline from 'readline';

const path = "D:\\downloads\\eswiki-20241201-pages-articles-multistream1.xml-p1p159400";

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g,'') // Remove invalid characters
    .replace(/\s+/g,'_') // Replace spaces with underscores
    .substring(0,255); // Limit length to 255 characters
}

async function readFileByLines(filePath: string): Promise<void> {
  let res = '';

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
          console.log(`Writed page ${title}`);
          fs.writeFileSync(`D:\\code\\crawlers\\first-crawler\\src\\splitted\\${sanitizeFileName(title)}.xml`,buffer);
        }
      }
      console.log(i);
    }
  } catch (error) {
    console.error(`Error reading file: ${(error as Error).message}`);
  }
}

// Example usage:
readFileByLines(path);
