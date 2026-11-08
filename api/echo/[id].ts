type EchoResponse = { status: (code: number) => EchoResponse; send: (body: string) => void };
export default function handler(request: { query?: Record<string, string | string[] | undefined>; url?: string }, response: EchoResponse): void {
  response.status(200).send(JSON.stringify({ query: request.query ?? null, url: request.url ?? null }));
}
