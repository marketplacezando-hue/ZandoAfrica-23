type HealthResponse = {
  status: (code: number) => HealthResponse;
  setHeader: (name: string, value: string) => HealthResponse;
  send: (body: string) => void;
};

export default function handler(_request: unknown, response: HealthResponse): void {
  response.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8').send('ok');
}
