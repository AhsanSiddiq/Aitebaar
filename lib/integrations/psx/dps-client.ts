import { PSX_CONFIG } from "@/config/psx";
import { parseCompanyHtml, parseEod, parseSymbols } from "./parsers";
import type { PsxCompanyData, PsxMarketDataSource, PsxPricePoint, PsxSymbolRecord } from "./types";

export class PsxFetchError extends Error {
  constructor(message: string, readonly url: string, readonly status?: number) {
    super(message);
  }
}

/** Client for the PSX data portal (dps.psx.com.pk). Server-side only. */
export class DpsPsxClient implements PsxMarketDataSource {
  readonly source = "DPS";
  constructor(private readonly baseUrl = PSX_CONFIG.baseUrl, private readonly fetchImpl: typeof fetch = fetch) {}

  private async get(path: string, accept: "json" | "html"): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PSX_CONFIG.requestTimeoutMs);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          signal: ctrl.signal,
          headers: { "User-Agent": PSX_CONFIG.userAgent, Accept: accept === "json" ? "application/json" : "text/html", "X-Requested-With": "XMLHttpRequest" },
          cache: "no-store",
        });
        if (res.status === 429 || res.status >= 500) throw new PsxFetchError(`PSX returned ${res.status}`, url, res.status);
        if (!res.ok) {
          clearTimeout(timer);
          throw Object.assign(new PsxFetchError(`PSX returned ${res.status}`, url, res.status), { final: true });
        }
        const body = accept === "json" ? await res.json() : await res.text();
        clearTimeout(timer);
        return body;
      } catch (e) {
        lastErr = e;
        if ((e as { final?: boolean }).final || ctrl.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
    clearTimeout(timer);
    if (lastErr instanceof PsxFetchError) throw lastErr;
    throw new PsxFetchError(`Could not reach PSX: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`, url);
  }

  async fetchSymbols(): Promise<PsxSymbolRecord[]> {
    return parseSymbols(await this.get(PSX_CONFIG.endpoints.symbols, "json"));
  }

  async fetchEod(symbol: string): Promise<PsxPricePoint[]> {
    return parseEod(await this.get(PSX_CONFIG.endpoints.eod(symbol), "json"));
  }

  async fetchCompany(symbol: string): Promise<PsxCompanyData> {
    const html = (await this.get(PSX_CONFIG.endpoints.company(symbol), "html")) as string;
    return parseCompanyHtml(html, symbol, this.baseUrl);
  }
}
