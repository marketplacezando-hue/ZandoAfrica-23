import { decodeProductRouteId, encodeProductRouteId } from './product-route-id';

type HealthResponse = { status: (code: number) => HealthResponse; send: (body: string) => void };

export default function handler(_request: unknown, response: HealthResponse): void {
  const id = '2e9fb607-51d6-4346-8459-0e6a193cfd9f';
  response.status(200).send(`${encodeProductRouteId(id)}|${decodeProductRouteId(encodeProductRouteId(id))}`);
}
