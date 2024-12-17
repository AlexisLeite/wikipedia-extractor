import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { ProcessingUnit,Processor } from "./Processor.js";
import { createHash } from 'crypto';
import { Configuration } from "./Configuration.js";
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: '',
});

const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  database: 'sem_search',
  port: 5433
});

pool.query(`CREATE TABLE IF NOT EXISTS sem_search (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embeddings vector(3072)
);`);

async function search(str: string) {
  console.log("Realizando embedding");
  const newEmbedding = await client.embeddings.create({
    input: str,model: 'text-embedding-3-large'
  });
  if (newEmbedding.data.length) {
    const vector = newEmbedding.data[0].embedding;
    console.log("Embedding obtenido, buscando");

    const result = await pool.query(`
WITH distance as (select id,embeddings <-> $1 as distance from sem_search)
SELECT distance.distance, sem_search.content from sem_search natural join distance where distance.distance < 1.5 order by distance.distance asc limit 30
`,[JSON.stringify(vector)]);

    console.log(result.rows);
  }
}

search('Ciudades dentro de Düsseldorf');

export class StoreInDBProcessor extends Processor {
  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  locked = false;
  lastCalls: number[] = [];
  calls = 0;

  maxRPM = 3000;
  maxRPMperiod = 60 * 1000;

  private async awaitTime(ms: number) {
    return new Promise<void>(resolve => {
      setTimeout(resolve,ms);
    });
  }

  async throttle<T>(cb: () => Promise<T>): Promise<T> {
    while (this.locked) {
      await this.awaitTime(100);
    }
    this.locked = true;

    return new Promise<T>(async (resolve) => {
      const now = Date.now();
      const firstCallTime = this.lastCalls.at(-1) ?? now;

      this.lastCalls.unshift(now);
      this.lastCalls.splice(this.maxRPM);

      const firstCallDif = now - firstCallTime;
      if (this.lastCalls.length >= this.maxRPM && firstCallDif < this.maxRPMperiod) {
        const delay = this.maxRPMperiod - (now - firstCallTime) + 100;
        console.log("Throttling " + delay);
        await this.awaitTime(delay);
        resolve(cb());
        this.locked = false;
      } else {
        resolve(cb());
        this.locked = false;
      }
    });
  }

  private static inserted = 0;
  private static fromCache = 0;
  private static cacheMisses = 0;

  override async run(pu: ProcessingUnit): Promise<ProcessingUnit[]> {
    const key = this.sha256(pu.content);
    const cachePath = path.resolve(Configuration.cacheDir,key);
    const content = pu.content.split('\n').filter(Boolean).slice(0,2).join('\n\n');

    let embedding: number[] = [];
    if (Configuration.cacheActive && fs.existsSync(cachePath)) {
      if (++StoreInDBProcessor.fromCache % 100 === 0 && StoreInDBProcessor.fromCache) {
        console.log('Read from cache: ' + StoreInDBProcessor.fromCache);
      }
      embedding = JSON.parse(fs.readFileSync(cachePath).toString()) as number[];
    } else {
      if (++StoreInDBProcessor.cacheMisses % 100 === 0 && StoreInDBProcessor.cacheMisses) {
        console.log('Cache miss: ' + StoreInDBProcessor.cacheMisses);
      }
      const newEmbedding = await this.throttle(() => client.embeddings.create({
        input: content,model: 'text-embedding-3-large'
      }));
      if (newEmbedding.data.length) {
        embedding = newEmbedding.data[0].embedding;
        if (Configuration.cacheActive) {
          fs.writeFileSync(cachePath,JSON.stringify(embedding));
        }
      }
    }

    pool.query(`insert into sem_search (content, embeddings) values ($1, $2)`,[content,JSON.stringify(embedding)]);

    if (++StoreInDBProcessor.inserted % 1000 == 0 && StoreInDBProcessor.inserted) {
      console.log(`Inserted ${StoreInDBProcessor.inserted} vectors`);
    }

    return [];
  }
}