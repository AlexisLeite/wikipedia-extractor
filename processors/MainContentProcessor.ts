/**
 * Takes the main content of a Wikipedia page and processes it,
 * 
 * - Removing images: [[...]]
 * - Replacing links: [[Paralelismo (biología)|evolución paralela]]
 * - Removing == Véase también ==
 * - Removing == Referencias ==
 * - Removing refs
 * - Special characters
 */

import { ProcessingUnit,Processor } from "./Processor.js";

export class MainContentProcessor extends Processor {
  private replaceSpecialChars(content: string): string {
    return content.replaceAll('&nbsp;','').replaceAll('{{esd}}','');
  }

  private removeGalleries(content: string): string {
    let match: RegExpMatchArray | null = null;

    while (match = content.match(/<gallery>/)) {
      let start = match.index!;

      const refLength = content.substring(start).match('</gallery>')!.index! + '</gallery>'.length;

      content = content.substring(0,start) + content.substring(start + refLength);
    }

    return content;
  }

  private removeRefs(content: string): string {
    let match: RegExpMatchArray | null = null;

    while (match = content.match(/<ref(?: name *= *"?[^"\/]+"? *)?>/)) {
      let start = match.index!;

      const refLength = content.substring(start).match('</ref>')!.index! + 6;

      content = content.substring(0,start) + content.substring(start + refLength);
    }

    content = content.replaceAll(/<ref name= *"?[^"]+ *"? *\/>/g,"");

    return content;
  }

  private removeImages(content: string): string {
    return content;
  }

  private replaceImagesSlicing(content: string): string {
    return content.replaceAll(/\{\{Recortar imagen[^}]+?}}/g,'');
  }

  private replaceSpecialBracketSentences(content: string): string {
    return content.replaceAll(/\{\{([^}]+?)}}/g,(...res) => {
      let parts = (res[1].split('|') as string[]);
      parts = parts.slice(Math.min(1,parts.length - 1));
      return parts.join('|');
    });
  }

  private processSquareContent = (content: string): string => {
    let match: RegExpMatchArray | null = null;
    while (match = content.match(/\[\[([^\]]+?)]]/)) {
      let parts = (match[1].split('|') as string[]);
      parts = parts.slice(Math.min(1,parts.length - 1));

      content = parts.join('|');
    }
    return content;
  };

  private replaceLinks(content: string): string {
    let openSquares = 0;
    let startIndex = 0;

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '[') {
        if (openSquares === 0) {
          startIndex = i;
        }
        openSquares++;
      }

      if (content[i] === ']') {
        if (openSquares === 1) {
          const previousContent = content.substring(startIndex,i + 1);
          const newContent = this.processSquareContent(previousContent);

          content = content.substring(0,startIndex) + newContent + content.substring(i + 1);

          i += (newContent.length - previousContent.length);

          startIndex = i + 1;
        }
        openSquares--;
      }
    }

    return content;
  }

  private contentProcessors: ((content: string) => string)[] = [
    this.removeRefs.bind(this),
    this.replaceSpecialChars.bind(this),
    this.removeImages.bind(this),
    this.replaceImagesSlicing.bind(this),
    this.replaceSpecialBracketSentences.bind(this),
    this.replaceLinks.bind(this),
    this.removeGalleries.bind(this),
  ];

  override run(pu: ProcessingUnit): ProcessingUnit[] {
    const indexOfViewAlso = pu.content.indexOf('== Véase también ==');

    let content = pu.content;

    if (indexOfViewAlso !== -1) {
      content = pu.content.substring(0,indexOfViewAlso);
    }

    for (const p of this.contentProcessors) {
      content = p(content);
    }

    return [{
      ...pu,content,target: 'STORE'
    }];
  }
}
