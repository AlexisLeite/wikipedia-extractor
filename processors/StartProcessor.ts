import { ProcessingUnit,Processor } from "./Processor.js";

/**
 * This processor takes the extracted elements from xml and separates the 
 * interesting information widgets from the general contents and treats 
 * them separately.
 * 
 * Detected widgets so far starts with {{Widget title
 */
export class StartProcessor extends Processor {
  private findSplitIndex(str: string) {
    let openBrackets = 0;
    let openSquares = 0;
    let i = 0;
    while (str[i] !== undefined) {
      switch (str[i]) {
      case '{':
        openBrackets++;
        break;
      case '}':
        openBrackets--;
        break;
      case '[':
        openSquares++;
        break;
      case ']':
        openSquares--;
        break;
      }

      if (str[i].match(/[\w']/) && !openBrackets && !openSquares) {
        return i;
      }

      i++;
    }

    return i;
  }

  override run(pu: ProcessingUnit): ProcessingUnit[] {
    const pus: ProcessingUnit[] = [];

    let contentStart: number = 0;
    try {
      contentStart = this.findSplitIndex(pu.content);
    } catch (_) {
      console.log(`Cannot find widgets for file: ${pu.name}`);
    }

    pus.push({
      content: pu.content.substring(contentStart),
      name: pu.name,
      target: 'PROCESS_CONTENT'
    });

    if (contentStart !== 0) {
      pus.push({
        content: pu.content.substring(0,contentStart),
        name: `${pu.name}_widgets`,
        target: 'STORE'
      });
    }

    return pus;
  }
}