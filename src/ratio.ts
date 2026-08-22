import { Redis } from "@upstash/redis";

// 1 consulta gratis; a partir de ahi, ratio 1:1 (necesitas al menos tantas
// contribuciones fusionadas como consultas para poder seguir consultando).
const FREE_READS = 1;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface RatioStatus {
  allowed: boolean;
  reads: number;
  contributions: number;
}

export async function checkAndRecordRead(clientId: string): Promise<RatioStatus> {
  const redis = getRedis();
  if (!redis) {
    // Sin Redis configurado (ej. en local): no se aplica ratio.
    return { allowed: true, reads: 0, contributions: 0 };
  }

  const readsKey = `vibepat:reads:${clientId}`;
  const contribKey = `vibepat:contrib:${clientId}`;

  const [reads, contributions] = await Promise.all([
    redis.get<number>(readsKey).then((v) => v ?? 0),
    redis.get<number>(contribKey).then((v) => v ?? 0),
  ]);

  if (reads >= contributions + FREE_READS) {
    return { allowed: false, reads, contributions };
  }

  const newReads = await redis.incr(readsKey);
  return { allowed: true, reads: newReads, contributions };
}

export async function recordContribution(clientId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.incr(`vibepat:contrib:${clientId}`);
}
